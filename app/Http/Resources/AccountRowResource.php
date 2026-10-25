<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccountRowResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $this->resource;
        $profile = $user->staffProfile;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $profile?->phone,
            'employee_id' => $profile->employee_id ?? '',
            'notes' => $profile?->notes,
            'status' => $user->suspended_at ? 'suspended' : 'active',
            'jobs_created' => (int) ($user->job_posts_posted_count ?? 0),
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}
