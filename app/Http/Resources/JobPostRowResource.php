<?php

namespace App\Http\Resources;

use App\Models\JobPost;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin JobPost */
class JobPostRowResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'job_title' => $this->job_title,
            'work_location' => $this->work_location,
            'created_at' => $this->created_at?->toISOString(),
            'closing_date' => $this->closing_date?->toDateString(),
            'salary_currency' => $this->salary_currency?->value,
            'monthly_salary_min' => $this->monthly_salary_min,
            'monthly_salary_max' => $this->monthly_salary_max,
            'recruitment_type' => $this->recruitment_type->value,
            'display_status' => $this->display_status->value,
            'applicants_count' => (int) $this->applications_count,
            'is_urgent' => $this->is_urgent,
        ];
    }
}
