<?php

namespace App\Repositories;

use App\Models\AuditLog;
use App\Models\JobPost;

class AuditLogRepository
{
    public function recordJobPostCreation(JobPost $post, string $ipAddress): void
    {
        AuditLog::query()->create([
            'actor_user_id' => $post->posted_by_user_id, 'action' => 'job_post.created',
            'subject_type' => JobPost::class, 'subject_id' => $post->id,
            'changes' => ['status' => $post->status->value], 'ip_address' => $ipAddress,
            'created_at' => now(),
        ]);
    }
}
