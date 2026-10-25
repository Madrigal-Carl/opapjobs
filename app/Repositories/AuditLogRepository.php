<?php

namespace App\Repositories;

use App\Enums\ApplicationStage;
use App\Models\Application;
use App\Models\AuditLog;
use App\Models\JobPost;
use App\Models\User;

class AuditLogRepository
{
    public function recordJobPostChange(JobPost $post, User $actor, string $action, string $ipAddress): void
    {
        AuditLog::query()->create([
            'actor_user_id' => $actor->id, 'action' => 'job_post.'.$action,
            'subject_type' => JobPost::class, 'subject_id' => $post->id,
            'changes' => ['status' => $post->status->value], 'ip_address' => $ipAddress,
            'created_at' => now(),
        ]);
    }

    public function recordApplicationStageChange(Application $application, User $actor, ApplicationStage $from, ApplicationStage $to, string $ipAddress): void
    {
        AuditLog::query()->create([
            'actor_user_id' => $actor->id, 'action' => 'application.stage_changed',
            'subject_type' => Application::class, 'subject_id' => $application->id,
            'changes' => ['from' => $from->value, 'to' => $to->value], 'ip_address' => $ipAddress,
            'created_at' => now(),
        ]);
    }

    public function recordJobPostCreation(JobPost $post, string $ipAddress): void
    {
        AuditLog::query()->create([
            'actor_user_id' => $post->posted_by_user_id, 'action' => 'job_post.created',
            'subject_type' => JobPost::class, 'subject_id' => $post->id,
            'changes' => ['status' => $post->status->value], 'ip_address' => $ipAddress,
            'created_at' => now(),
        ]);
    }

    /**
     * @param  array<int, string>  $changed
     */
    public function log(User $actor, string $action, User $subject, array $changed = [], ?string $ipAddress = null): void
    {
        AuditLog::query()->create([
            'actor_user_id' => $actor->id,
            'action' => $action,
            'subject_type' => User::class,
            'subject_id' => $subject->id,
            'changes' => ['changed' => $changed],
            'ip_address' => $ipAddress,
            'created_at' => now(),
        ]);
    }
}
