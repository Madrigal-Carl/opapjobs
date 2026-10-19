<?php

namespace App\Actions\JobPost;

use App\Data\JobPost\JobPostDuplicateData;
use App\Models\User;
use App\Services\JobPost\JobPostService;
use Illuminate\Support\Facades\DB;

class FindDuplicateJobPostsAction
{
    /**
     * Create a new class instance.
     */
    public function __construct(private JobPostService $service) {}

    /** @return list<array{id: int, job_title: string, created_at: ?string, display_status: string}> */
    public function execute(User $user, JobPostDuplicateData $data): array
    {
        return DB::transaction(fn (): array => $this->service->duplicates($user, $data));
    }
}
