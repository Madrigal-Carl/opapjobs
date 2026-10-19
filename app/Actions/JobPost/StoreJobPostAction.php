<?php

namespace App\Actions\JobPost;

use App\Data\JobPost\StoreJobPostData;
use App\Models\JobPost;
use App\Models\User;
use App\Services\JobPost\JobPostService;
use Illuminate\Support\Facades\DB;

class StoreJobPostAction
{
    /**
     * Create a new class instance.
     */
    public function __construct(private JobPostService $service) {}

    public function execute(User $user, StoreJobPostData $data): JobPost
    {
        return DB::transaction(fn (): JobPost => $this->service->create($user, $data));
    }
}
