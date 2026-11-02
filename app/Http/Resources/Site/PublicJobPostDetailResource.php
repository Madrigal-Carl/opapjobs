<?php

namespace App\Http\Resources\Site;

use App\Enums\JobPostDisplayStatus;
use App\Models\JobPost;
use Illuminate\Http\Request;

/**
 * The full job profile. For manpooling the employer block and job order
 * number are left out of the payload entirely, not merely hidden in the UI.
 *
 * @mixin JobPost
 */
class PublicJobPostDetailResource extends PublicJobPostPreviewResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $employer = $this->isManpooling() || $this->employer === null ? null : [
            'name' => $this->cap($this->employer->employer_name, 160),
            'location' => $this->cap($this->employer->employer_location, 160),
            'licenseNumber' => $this->cap($this->employer->employer_license_number, 80),
        ];

        return [
            ...parent::toArray($request),
            'salaryCurrency' => $this->salary_currency?->value,
            'monthlySalaryMin' => $this->monthly_salary_min,
            'monthlySalaryMax' => $this->monthly_salary_max,
            'displayStatus' => $this->display_status->value,
            'isAcceptingApplications' => $this->display_status === JobPostDisplayStatus::Active,
            'jobOrderNumber' => $this->isManpooling() ? null : $this->cap($this->job_order_number, 80),
            'employerDetails' => $employer,
            'contact' => [
                'name' => $this->cap($this->contact_person_name, 160),
                'email' => $this->cap($this->contact_email, 160),
                'phone' => $this->cap($this->contact_phone, 60),
            ],
        ];
    }
}
