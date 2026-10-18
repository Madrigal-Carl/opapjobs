<?php

namespace App\Queries;

use App\Enums\ApplicationStage;
use App\Enums\JobPostDisplayStatus;
use App\Enums\JobPostStatus;
use App\Enums\RecruitmentType;
use App\Models\Application;
use App\Models\JobPost;
use App\Models\User;

class JobPostKpis
{
    /** @return array{active_jobs: int, total_applicants: int, with_job_order: int, successful_placements: int} */
    public function for(User $user): array
    {
        // KPIs describe the whole scope, never the table's filters. Do not cache: expiry flips at midnight.
        $scope = JobPost::query()->visibleTo($user);
        $status = JobPost::displayStatusExpression();
        $posts = (clone $scope)->toBase()
            ->selectRaw("SUM(CASE WHEN ({$status['sql']}) = ? THEN 1 ELSE 0 END) AS active_jobs", [
                ...$status['bindings'], JobPostDisplayStatus::Active->value,
            ])
            ->selectRaw('SUM(CASE WHEN job_posts.status <> ? AND job_posts.recruitment_type = ? THEN 1 ELSE 0 END) AS with_job_order', [
                JobPostStatus::Archived->value, RecruitmentType::Joborder->value,
            ])->first();
        $applications = Application::query()->whereIn('job_post_id', $scope->select('job_posts.id'))->toBase()
            ->selectRaw('COUNT(*) AS total_applicants')
            ->selectRaw('SUM(CASE WHEN stage = ? THEN 1 ELSE 0 END) AS successful_placements', [ApplicationStage::Hired->value])
            ->first();

        return [
            'active_jobs' => (int) $posts->active_jobs,
            'total_applicants' => (int) $applications->total_applicants,
            'with_job_order' => (int) $posts->with_job_order,
            'successful_placements' => (int) $applications->successful_placements,
        ];
    }
}
