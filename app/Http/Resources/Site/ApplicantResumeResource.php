<?php

namespace App\Http\Resources\Site;

use App\Http\Resources\Site\Concerns\CapsStrings;
use App\Models\ApplicantCertification;
use App\Models\ApplicantDocument;
use App\Models\ApplicantEducation;
use App\Models\ApplicantExperience;
use App\Models\ApplicantSkill;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The applicant's resume in the `ApplicantProfile` shape the resume page and
 * the apply wizard read. Dates use the formats those forms already show
 * ("Mar 2021" for jobs, a year for schooling, ISO for certificates).
 * Documents carry no URL: files live on the private disk and no download
 * route exists yet.
 *
 * @mixin User
 */
class ApplicantResumeResource extends JsonResource
{
    use CapsStrings;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $profile = $this->applicantProfile;

        return [
            'name' => $this->cap($this->name, 160),
            'email' => $this->cap($this->email, 160),
            'headline' => $this->cap($profile?->headline, 200) ?? '',
            'phone' => $this->cap($profile?->phone_number, 60) ?? '',
            'location' => $this->cap($profile?->current_location, 160) ?? '',
            'avatarUrl' => '',
            'summary' => $this->cap($profile?->professional_summary, 5000) ?? '',
            'visibleToEmployers' => $profile === null ? true : $profile->is_visible_to_agencies,
            'coverLetter' => $this->cap($profile?->default_cover_letter, 5000) ?? '',
            'experiences' => $this->experiences->map(fn (ApplicantExperience $entry): array => [
                'id' => 'exp-'.$entry->id,
                'role' => $this->cap($entry->job_role, 160) ?? '',
                'company' => $this->cap($entry->company_name, 160) ?? '',
                'start' => $entry->started_on?->format('M Y') ?? '',
                'end' => $entry->ended_on?->format('M Y') ?? '',
                'location' => $this->cap($entry->work_location, 160) ?? '',
                'description' => $this->cap($entry->responsibilities, 5000) ?? '',
            ])->values()->all(),
            'education' => $this->education->map(fn (ApplicantEducation $entry): array => [
                'id' => 'edu-'.$entry->id,
                'school' => $this->cap($entry->school_name, 160) ?? '',
                'degree' => $this->cap($entry->degree, 160) ?? '',
                'field' => $this->cap($entry->field_of_study, 160) ?? '',
                'start' => $entry->started_on?->format('Y') ?? '',
                'end' => $entry->ended_on?->format('Y') ?? '',
            ])->values()->all(),
            'certifications' => $this->certifications->map(fn (ApplicantCertification $entry): array => [
                'id' => 'cert-'.$entry->id,
                'name' => $this->cap($entry->certification_name, 160) ?? '',
                'issuer' => $this->cap($entry->issuing_organization, 160) ?? '',
                'issueDate' => $entry->issued_on?->toDateString() ?? '',
                'expiryDate' => $entry->expires_on?->toDateString() ?? '',
                'credentialUrl' => $this->cap($entry->credential_url, 500) ?? '',
            ])->values()->all(),
            'skills' => $this->skills->map(fn (ApplicantSkill $entry): array => [
                'id' => 'skill-'.$entry->id,
                'name' => $this->cap($entry->skill_name, 120) ?? '',
                'level' => ucfirst($entry->skill_level->value),
            ])->values()->all(),
            'documents' => $this->documents->map(fn (ApplicantDocument $document): array => [
                'id' => 'doc-'.$document->id,
                'name' => $this->cap($document->original_file_name, 200) ?? '',
                'uploadedAt' => $document->uploaded_at->format('M d, Y'),
                'size' => self::fileSize($document->file_size_bytes),
                'url' => '',
                'primary' => $document->is_primary,
            ])->values()->all(),
        ];
    }

    /** Mirrors `formatFileSize` in resources/js/data/applicant-profile.ts. */
    private static function fileSize(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }

        if ($bytes < 1024 * 1024) {
            return max(1, (int) round($bytes / 1024)).' KB';
        }

        return number_format($bytes / (1024 * 1024), 1).' MB';
    }
}
