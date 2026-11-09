<?php

namespace App\Http\Resources\Site;

use App\Models\JobPost;
use App\Models\JobPostLanguage;
use Illuminate\Http\Request;

/**
 * A card plus the requirements and rich text the jobs page shows in its
 * split-view preview. No contact details, job order number or employer
 * licence: those stay on the full job profile.
 *
 * @mixin JobPost
 */
class PublicJobPostPreviewResource extends PublicJobPostCardResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'jobDescription' => $this->cap($this->job_description, 20000),
            'otherRequirements' => $this->cap($this->other_requirements, 20000),
            'applicationInstructions' => $this->cap($this->application_instructions, 20000),
            'requiredDocuments' => $this->required_documents ?? [],
            'contractType' => $this->contract_type->value,
            'educationLevel' => $this->education_level->value,
            'minExperienceYears' => $this->min_experience_years,
            'maxExperienceYears' => $this->max_experience_years,
            'genderRequirement' => $this->gender_requirement->value,
            'languages' => $this->languages->map(fn (JobPostLanguage $language): array => [
                'language' => ucfirst($language->language->value),
                'proficiency' => $language->proficiency->value,
            ])->values()->all(),
        ];
    }
}
