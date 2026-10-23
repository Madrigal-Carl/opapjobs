<?php

namespace App\Http\Resources;

use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Application */
class ApplicationRowResource extends JsonResource
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
            'stage' => $this->stage->value,
            'submitted_at' => $this->submitted_at->toISOString(),
            'applicant_name' => $this->applicant->name,
            'job_title' => $this->jobPost->job_title,
            'employer_name' => $this->jobPost->employer?->employer_name,
        ];
    }
}
