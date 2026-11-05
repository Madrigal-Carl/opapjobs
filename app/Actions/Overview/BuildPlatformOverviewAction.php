<?php

namespace App\Actions\Overview;

use App\Models\User;
use App\Repositories\Overview\PlatformOverviewRepository;

/**
 * Assembles the Platform overview payload in one place so the controller
 * stays a thin render and the shape is documented once.
 */
class BuildPlatformOverviewAction
{
    public function __construct(private PlatformOverviewRepository $repository) {}

    /**
     * @return array{
     *     summary: array{
     *         total_jobs: int,
     *         active_jobs: int,
     *         total_applications: int,
     *         stage_counts: array<string, int>,
     *         conversion_rate: int
     *     },
     *     days: list<array{date: string, applications: int, reviewed: int, interview: int, hired: int}>,
     *     top_jobs: list<array{id: int, title: string, applicants: int}>,
     *     range: array{start: string, end: string}|null
     * }
     */
    public function execute(User $user): array
    {
        return [
            'summary' => $this->repository->summary($user),
            'days' => $this->repository->days($user),
            'top_jobs' => $this->repository->topJobs($user, 3),
            'range' => $this->repository->dateRange($user),
        ];
    }
}
