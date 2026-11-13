<?php

namespace App\Services\Site;

use App\Enums\ApplicationStage;
use App\Enums\DocumentType;
use App\Enums\JobPostDisplayStatus;
use App\Enums\QuestionAnswerType;
use App\Events\ApplicationSubmitted;
use App\Models\ApplicantDocument;
use App\Models\Application;
use App\Models\JobPost;
use App\Models\JobPostQuestion;
use App\Models\User;
use App\Repositories\Site\ApplicantRepository;
use App\Repositories\Site\PublicJobPostRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The signed-in applicant's side of the site, read from the database:
 * My Jobs, the resume, and job application submission.
 */
class ApplicantService
{
    public function __construct(
        private ApplicantRepository $applicant,
        private PublicJobPostRepository $posts,
    ) {}

    /** @return array{applied: list<int>, saved: list<int>, archived: list<int>} */
    public function activity(int $userId): array
    {
        return $this->applicant->activityIds($userId);
    }

    /** @param array{resume_document_id?: ?int, resume?: array{original_file_name: string, storage_path: string, mime_type: ?string, file_size_bytes: int}, cover_letter?: ?string, answers?: array<int, ?string>, documents?: list<array{name: string, file: array{original_file_name: string, storage_path: string, mime_type: ?string, file_size_bytes: int}}>} $data */
    public function submit(User $user, int $jobId, array $data): Application
    {
        $this->applicant->lockJob($jobId);
        $post = $this->posts->findVisible($jobId, $user->id);
        abort_if($post === null, 404);

        if ($post->display_status !== JobPostDisplayStatus::Active) {
            throw ValidationException::withMessages(['application' => __('This job is no longer accepting applications.')]);
        }
        if ($this->applicant->hasApplication($user->id, $jobId)) {
            throw ValidationException::withMessages(['application' => __('You have already applied for this job.')]);
        }

        $requiredDocuments = $post->required_documents ?? [];
        $documents = $data['documents'] ?? [];
        $documentNames = array_column($documents, 'name');
        $errors = [];
        foreach ($requiredDocuments as $index => $name) {
            if (! in_array($name, $documentNames, true)) {
                $errors['documents.'.$index] = __('Upload :name as a PDF.', ['name' => $name]);
            }
        }
        if (array_diff($documentNames, $requiredDocuments) !== [] || count(array_unique($documentNames)) !== count($documentNames)) {
            $errors['documents'] = __('Upload only the documents required by this job.');
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $questions = $this->applicant->questions($jobId);
        $rules = ['answers' => $questions->isEmpty() ? ['array', 'size:0'] : ['array:'.implode(',', $questions->modelKeys())]];
        foreach ($questions as $question) {
            $rules['answers.'.$question->id] = [
                $question->is_required ? 'required' : 'nullable', 'string',
                ...match ($question->answer_type) {
                    QuestionAnswerType::Yesno => [Rule::in(['Yes', 'No'])],
                    QuestionAnswerType::Selection => [Rule::in($question->options ?? [])],
                    QuestionAnswerType::Number => ['numeric'],
                    QuestionAnswerType::Paragraph => ['max:10000'],
                    QuestionAnswerType::Short => ['max:2000'],
                },
            ];
        }
        $answers = Validator::make(['answers' => $data['answers'] ?? []], $rules)->validate()['answers'];

        if (isset($data['resume'])) {
            $resume = $user->documents()->create([
                ...$data['resume'], 'document_type' => DocumentType::Resume,
                'is_primary' => false, 'uploaded_at' => now(),
            ]);
        } else {
            $resume = $this->applicant->resumeDocument($user->id, (int) ($data['resume_document_id'] ?? 0));
            if ($resume === null || ! Storage::disk('local')->exists($resume->storage_path)) {
                throw ValidationException::withMessages(['resume_document_id' => __('Choose an available resume from your profile or upload a new one.')]);
            }
        }

        $application = $this->applicant->createApplication([
            'job_post_id' => $jobId, 'applicant_user_id' => $user->id, 'resume_document_id' => $resume->id,
            'cover_letter' => $data['cover_letter'] ?? null, 'stage' => ApplicationStage::Pending->value, 'submitted_at' => now(),
        ]);
        foreach ($documents as $document) {
            $file = $user->documents()->create([
                ...$document['file'], 'document_type' => DocumentType::Other,
                'is_primary' => false, 'uploaded_at' => $application->submitted_at,
            ]);
            $application->supportingDocuments()->attach($file->id, ['requirement_name' => $document['name']]);
        }
        $rows = [];
        foreach ($answers as $questionId => $answer) {
            if (is_string($answer) && trim($answer) !== '') {
                $rows[] = ['job_post_question_id' => (int) $questionId, 'answer_text' => trim($answer)];
            }
        }
        $this->applicant->createAnswers($application, $rows);
        $application->stageHistory()->create([
            'from_stage' => null, 'to_stage' => ApplicationStage::Pending, 'changed_by_user_id' => $user->id, 'created_at' => now(),
        ]);
        ApplicationSubmitted::dispatch($application);

        return $application;
    }

    /** @return array{applied: Collection<int, JobPost>, saved: Collection<int, JobPost>, archived: Collection<int, JobPost>} */
    public function myJobs(int $userId): array
    {
        return [
            'applied' => $this->posts->appliedBy($userId, archived: false),
            'saved' => $this->posts->savedBy($userId),
            'archived' => $this->posts->appliedBy($userId, archived: true),
        ];
    }

    public function resume(int $userId): ?User
    {
        return $this->applicant->resume($userId);
    }

    /**
     * The job post being applied to and its questions, or `null` when the
     * applicant may not see it (same rule as the job profile).
     *
     * @return null|array{post: JobPost, questions: Collection<int, JobPostQuestion>, applicant: User|null}
     */
    public function application(string $jobPostId, int $userId): ?array
    {
        if (! ctype_digit($jobPostId) || strlen($jobPostId) > 18) {
            return null;
        }

        $post = $this->posts->findVisible((int) $jobPostId, $userId);
        if ($post === null) {
            return null;
        }

        $resume = $this->applicant->resume($userId);
        if ($resume !== null) {
            $resume->setRelation('documents', $resume->documents->filter(fn (ApplicantDocument $document): bool => $document->document_type === DocumentType::Resume));
        }

        return [
            'post' => $post,
            'questions' => $this->applicant->questions($post->id),
            'applicant' => $resume,
        ];
    }
}
