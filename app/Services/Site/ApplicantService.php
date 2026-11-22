<?php

namespace App\Services\Site;

use App\Enums\ApplicationStage;
use App\Enums\DocumentType;
use App\Enums\JobPostDisplayStatus;
use App\Enums\QuestionAnswerType;
use App\Events\ApplicationSubmitted;
use App\Models\Application;
use App\Models\JobPost;
use App\Models\JobPostQuestion;
use App\Models\User;
use App\Repositories\Site\ApplicantRepository;
use App\Repositories\Site\PublicJobPostRepository;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The signed-in applicant's side of the site, read from the database:
 * My Jobs, the profile, and job application submission.
 */
class ApplicantService
{
    /** Files a profile may hold at once; removed (archived) ones do not count. */
    public const MAX_DOCUMENTS = 20;

    public function __construct(
        private ApplicantRepository $applicant,
        private PublicJobPostRepository $posts,
    ) {}

    /** @return array{applied: list<int>, saved: list<int>, archived: list<int>} */
    public function activity(int $userId): array
    {
        return $this->applicant->activityIds($userId);
    }

    /** @param array{resume_document_id?: ?int, resume?: array{original_file_name: string, storage_path: string, mime_type: ?string, file_size_bytes: int}, cover_letter?: ?string, answers?: array<int, ?string>, documents?: list<array{name: string, document_id?: ?int, file?: array{original_file_name: string, storage_path: string, mime_type: ?string, file_size_bytes: int}}>} $data */
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

        $requiredDocuments = $post->requiredDocuments->pluck('document_name')->all();
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
                    QuestionAnswerType::Selection => [Rule::in($question->options->pluck('option_text')->all())],
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
            $resume = $this->applicant->ownDocument($user->id, (int) ($data['resume_document_id'] ?? 0));
            if ($resume === null || ! Storage::disk('local')->exists($resume->storage_path)) {
                throw ValidationException::withMessages(['resume_document_id' => __('Choose an available resume from your profile or upload a new one.')]);
            }
        }

        $application = $this->applicant->createApplication([
            'job_post_id' => $jobId, 'applicant_user_id' => $user->id, 'resume_document_id' => $resume->id,
            'cover_letter' => $data['cover_letter'] ?? null, 'stage' => ApplicationStage::Pending->value, 'submitted_at' => now(),
        ]);
        foreach ($documents as $index => $document) {
            if (isset($document['document_id'])) {
                $file = $this->applicant->ownDocument($user->id, (int) $document['document_id'], 'application/pdf');
                if ($file === null || ! Storage::disk('local')->exists($file->storage_path)) {
                    throw ValidationException::withMessages(['documents.'.$index => __('Choose an available PDF from your profile or upload :name.', ['name' => $document['name']])]);
                }
            } else {
                $file = $user->documents()->create([
                    ...$document['file'], 'document_type' => DocumentType::Other,
                    'is_primary' => false, 'uploaded_at' => $application->submitted_at,
                ]);
            }
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

    /** @return array{applied: Collection<int, JobPost>, saved: Collection<int, JobPost>} */
    public function myJobs(int $userId): array
    {
        return [
            'applied' => $this->posts->appliedBy($userId),
            'saved' => $this->posts->savedBy($userId),
        ];
    }

    /**
     * Saves the whole profile. Dates arrive in the formats the profile page
     * shows and are stored as the first day of that month or year.
     *
     * @param  array{name: string, headline?: ?string, phone?: ?string, location?: ?string, summary?: ?string, is_visible: bool, experiences: list<array{role: string, company: string, start: string, end?: ?string, location?: ?string, description?: ?string}>, education: list<array{school: string, degree: string, field?: ?string, start: string, end?: ?string}>, certifications: list<array{name: string, issuer: string, issued_on?: ?string, expires_on?: ?string, credential_url?: ?string}>, skills: list<array{name: string, level: string}>}  $data
     */
    public function updateProfile(User $user, array $data): void
    {
        $month = fn (?string $value): ?CarbonImmutable => $value ? CarbonImmutable::createFromFormat('!M Y', $value) : null;
        $year = fn (?string $value): ?CarbonImmutable => $value ? CarbonImmutable::createFromFormat('!Y', $value) : null;

        $this->applicant->saveProfile($user, $data['name'], [
            'headline' => $data['headline'] ?? null,
            'phone_number' => $data['phone'] ?? null,
            'current_location' => $data['location'] ?? null,
            'professional_summary' => $data['summary'] ?? null,
            'is_visible_to_agencies' => $data['is_visible'],
        ], [
            'experiences' => array_map(fn (array $row): array => [
                'job_role' => $row['role'], 'company_name' => $row['company'],
                'started_on' => $month($row['start']), 'ended_on' => $month($row['end'] ?? null),
                // Both columns are required; an unanswered one is stored blank.
                'work_location' => $row['location'] ?? '', 'responsibilities' => $row['description'] ?? '',
            ], $data['experiences']),
            'education' => array_map(fn (array $row): array => [
                'school_name' => $row['school'], 'degree' => $row['degree'], 'field_of_study' => $row['field'] ?? '',
                'started_on' => $year($row['start']), 'ended_on' => $year($row['end'] ?? null),
            ], $data['education']),
            'certifications' => array_map(fn (array $row): array => [
                'certification_name' => $row['name'], 'issuing_organization' => $row['issuer'],
                'issued_on' => $row['issued_on'] ?? null, 'expires_on' => $row['expires_on'] ?? null,
                'credential_url' => $row['credential_url'] ?? null,
            ], $data['certifications']),
            'skills' => array_map(fn (array $row): array => [
                'skill_name' => $row['name'], 'skill_level' => $row['level'],
            ], $data['skills']),
        ]);
    }

    /** @param list<array{original_file_name: string, storage_path: string, mime_type: ?string, file_size_bytes: int}> $files */
    public function storeDocuments(User $user, array $files): void
    {
        if ($this->applicant->documentCount($user->id) + count($files) > self::MAX_DOCUMENTS) {
            throw ValidationException::withMessages(['documents' => __('Your profile holds up to :max files. Remove one before adding more.', ['max' => self::MAX_DOCUMENTS])]);
        }

        foreach ($files as $file) {
            $user->documents()->create([
                ...$file, 'document_type' => DocumentType::Other, 'is_primary' => false, 'uploaded_at' => now(),
            ]);
        }
    }

    /**
     * Removes a file from the profile. It is archived rather than erased, so
     * an application that already sent it still has it.
     */
    /** Removes a profile file; returns its path when no application kept it, for the caller to erase once saved. */
    public function deleteDocument(User $user, int $documentId): ?string
    {
        $document = $this->applicant->ownDocument($user->id, $documentId);
        abort_if($document === null, 404);

        if ($document->applications()->exists() || $document->supportingApplications()->exists()) {
            $document->delete();

            return null;
        }

        $document->forceDelete();

        return $document->storage_path;
    }

    /** Points the profile at a new photo and returns the old one's path to clean up. */
    public function updateAvatar(User $user, string $path): ?string
    {
        return $this->applicant->setAvatarPath($user, $path);
    }

    /** Bookmarks a job post the applicant can see, or removes the bookmark. */
    public function setSaved(User $user, int $jobId, bool $saved): void
    {
        if (! $saved) {
            $this->applicant->unsave($user->id, $jobId);

            return;
        }

        abort_if($this->posts->findVisible($jobId, $user->id) === null, 404);
        $this->applicant->save($user->id, $jobId);
    }

    public function profile(int $userId): ?User
    {
        return $this->applicant->profile($userId);
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

        // Every profile file is offered: as the resume, or as a required PDF.
        return [
            'post' => $post,
            'questions' => $this->applicant->questions($post->id),
            'applicant' => $this->applicant->profile($userId),
        ];
    }
}
