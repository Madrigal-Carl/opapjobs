<?php

namespace App\Http\Resources;

use App\Enums\Permission;
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
        $canManage = $request->user()?->can(Permission::ManageApplications->value) ?? false;
        $next = $this->stage->next();
        $canProceed = $canManage && $next !== null;
        $canReject = $canManage && ! $this->stage->isTerminal();

        return [
            'id' => $this->id,
            'stage' => $this->stage->value,
            'submitted_at' => $this->submitted_at->toISOString(),
            'applicant_name' => $this->applicant->name,
            'job_title' => $this->jobPost->job_title,
            'employer_name' => $this->jobPost->employer?->employer_name,
            'available_transitions' => array_keys(array_filter(['proceed' => $canProceed, 'reject' => $canReject])),
            'can_proceed' => $canProceed,
            'next_stage' => $next?->value,
            'can_reject' => $canReject,
        ];
    }
}
