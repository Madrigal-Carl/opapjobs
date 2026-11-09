<?php

namespace App\Http\Resources;

use App\Enums\Permission;
use App\Models\ApplicantCertification;
use App\Models\ApplicantDocument;
use App\Models\ApplicantEducation;
use App\Models\ApplicantExperience;
use App\Models\ApplicantSkill;
use App\Models\Application;
use App\Models\ApplicationStageHistory;
use App\Models\JobPostQuestion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/** @mixin Application */
class ApplicationDetailResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $post = $this->jobPost;
        $profile = $this->applicant->applicantProfile;
        $canManage = $request->user()?->can(Permission::ManageApplications->value) ?? false;
        $next = $this->stage->next();

        return [
            'id' => $this->id,
            'stage' => $this->stage->value,
            'submitted_at' => $this->submitted_at->toISOString(),
            'cover_letter' => $this->cover_letter,
            'expected_monthly_salary' => $this->expected_monthly_salary,
            'availability' => $this->availability?->value,
            'applicant' => [
                'id' => $this->applicant->id,
                'name' => $this->applicant->name,
                'initials' => $this->initials($this->applicant->name),
                'email' => $this->applicant->email,
                'phone' => $profile?->phone_number,
                'headline' => $profile?->headline,
                'location' => $profile?->current_location,
                'summary' => $profile?->professional_summary,
                'pathway' => $profile?->preferred_pathway?->value,
            ],
            'job' => [
                'id' => $post->id,
                'title' => $post->job_title,
                'employer' => $post->employer?->employer_name,
                'agency' => $post->agency?->agency_name,
                'pathway' => $post->agency?->pathway?->value,
                'location' => $post->work_location,
                'salary' => $this->salary(),
                'salary_currency' => $post->salary_currency?->value,
                'category' => $post->subcategory?->category?->category_name,
                'sub_category' => $post->subcategory?->subcategory_name,
                'posting_type' => $post->recruitment_type->value,
                'job_order_number' => $post->job_order_number,
                'contract_type' => $post->contract_type->value,
                'vacancies' => $post->vacant_positions,
                'education' => $post->education_level->value,
                'gender_requirement' => $post->gender_requirement->value,
                'min_experience_years' => $post->min_experience_years,
                'max_experience_years' => $post->max_experience_years,
                'closing_date' => $post->closing_date?->toDateString(),
                'posted_at' => $post->created_at?->toISOString(),
                'other_requirements' => $post->other_requirements,
                'job_description' => $post->job_description,
                'required_documents' => $post->required_documents ?? [],
                'application_instructions' => $post->application_instructions,
                'contact_person_name' => $post->contact_person_name,
                'contact_email' => $post->contact_email,
                'contact_phone' => $post->contact_phone,
                'status' => $post->display_status->value,
                'is_urgent' => $post->is_urgent,
                'languages' => $post->languages->map(fn ($language): array => [
                    'language' => Str::headline($language->language->value),
                    'proficiency' => Str::headline($language->proficiency->value),
                ])->values()->all(),
            ],
            'questions' => $this->questions(),
            'experiences' => $this->applicant->experiences->map(fn (ApplicantExperience $experience): array => [
                'id' => $experience->id,
                'role' => $experience->job_role,
                'company' => $experience->company_name,
                'start' => $experience->started_on?->toDateString(),
                'end' => $experience->ended_on?->toDateString(),
                'location' => $experience->work_location,
                'description' => $experience->responsibilities,
            ])->values()->all(),
            'education' => $this->applicant->education->map(fn (ApplicantEducation $education): array => [
                'id' => $education->id,
                'school' => $education->school_name,
                'degree' => $education->degree,
                'field' => $education->field_of_study,
                'start' => $education->started_on?->toDateString(),
                'end' => $education->ended_on?->toDateString(),
            ])->values()->all(),
            'certifications' => $this->applicant->certifications->map(fn (ApplicantCertification $certification): array => [
                'id' => $certification->id,
                'name' => $certification->certification_name,
                'issuer' => $certification->issuing_organization,
                'issue_date' => $certification->issued_on?->toDateString(),
                'expiry_date' => $certification->expires_on?->toDateString(),
                'credential_url' => $certification->credential_url,
            ])->values()->all(),
            'skills' => $this->applicant->skills->map(fn (ApplicantSkill $skill): array => [
                'id' => $skill->id,
                'name' => $skill->skill_name,
                'level' => Str::headline($skill->skill_level->value),
            ])->values()->all(),
            'documents' => $this->documents(),
            'resume_document_id' => $this->resume_document_id,
            'history' => $this->stageHistory->map(fn (ApplicationStageHistory $history): array => [
                'id' => $history->id,
                'from_stage' => $history->from_stage?->value,
                'stage' => $history->to_stage->value,
                'changed_at' => $history->created_at->toISOString(),
                'changed_by' => $history->changedBy?->name,
                'note' => $history->note,
            ])->values()->all(),
            'available_transitions' => array_keys(array_filter([
                'proceed' => $canManage && $next !== null,
                'reject' => $canManage && ! $this->stage->isTerminal(),
            ])),
            'can_proceed' => $canManage && $next !== null,
            'next_stage' => $next?->value,
            'can_reject' => $canManage && ! $this->stage->isTerminal(),
            'can_manage' => $canManage,
        ];
    }

    private function initials(string $name): string
    {
        return Str::of($name)->explode(' ')->filter()
            ->take(2)->map(fn (string $part): string => Str::upper(Str::substr($part, 0, 1)))
            ->implode('');
    }

    private function salary(): string
    {
        $currency = Str::upper($this->jobPost->salary_currency->value ?? '');
        $min = $this->jobPost->monthly_salary_min;
        $max = $this->jobPost->monthly_salary_max;

        return match (true) {
            $min !== null && $max !== null => "{$currency} ".number_format((float) $min).'–'.number_format((float) $max),
            $min !== null => "{$currency} ".number_format((float) $min).'+',
            $max !== null => "{$currency} Up to ".number_format((float) $max),
            default => 'Competitive salary',
        };
    }

    /** @return list<array{id: int, label: string, type: string, required: bool, answer: ?string}> */
    private function questions(): array
    {
        return array_values($this->jobPost->questions
            ->filter(fn (JobPostQuestion $question): bool => ! $question->trashed() || $this->answers->contains('job_post_question_id', $question->id))
            ->map(fn (JobPostQuestion $question): array => [
                'id' => $question->id,
                'label' => $question->question_text,
                'type' => $question->answer_type->value,
                'required' => $question->is_required,
                'answer' => $this->answers->firstWhere('job_post_question_id', $question->id)?->answer_text,
            ])->all());
    }

    /** @return list<array{id: int, name: string, document_type: string, uploaded_at: ?string, size: string, url: ?string, primary: bool}> */
    private function documents(): array
    {
        return array_values($this->applicant->documents
            ->filter(fn (ApplicantDocument $document): bool => $document->uploaded_at->lessThanOrEqualTo($this->submitted_at))
            ->merge($this->supportingDocuments)
            ->map(fn (ApplicantDocument $document): array => [
                'id' => $document->id,
                'name' => ($document->getRelationValue('pivot')?->getAttribute('requirement_name') !== null
                    ? $document->getRelationValue('pivot')->getAttribute('requirement_name').' — ' : '').$document->original_file_name,
                'document_type' => $document->document_type->value,
                'uploaded_at' => $document->uploaded_at->toISOString(),
                'size' => $this->fileSize($document->file_size_bytes),
                'url' => Storage::disk('local')->exists($document->storage_path)
                    ? route('dashboard.applications.documents', ['application' => $this->id, 'document' => $document->id], absolute: false)
                    : null,
                'primary' => $document->is_primary,
            ])->all());
    }

    private function fileSize(?int $bytes): string
    {
        return match (true) {
            $bytes === null => 'Unknown size',
            $bytes >= 1048576 => number_format($bytes / 1048576, 1).' MB',
            default => max(1, (int) round($bytes / 1024)).' KB',
        };
    }
}
