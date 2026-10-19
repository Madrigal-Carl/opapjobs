<?php

namespace App\Actions\JobPost;

use App\Models\JobPost;
use App\Models\User;
use App\Services\JobPost\JobPostService;
use App\Support\JobPostIndexFilters;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ListJobPostsAction
{
    /**
     * Create a new class instance.
     */
    public function __construct(private JobPostService $service) {}

    /** @return array{posts: ?LengthAwarePaginator<int, JobPost>, kpis: ?array{active_jobs: int, total_applicants: int, with_job_order: int, successful_placements: int}} */
    public function execute(User $user, JobPostIndexFilters $filters, bool $includePosts = true, bool $includeKpis = false): array
    {
        return DB::transaction(fn (): array => $this->service->list($user, $filters, $includePosts, $includeKpis));
    }
}
