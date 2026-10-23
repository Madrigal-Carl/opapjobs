<?php

namespace App\Actions\JobPost;

use App\Data\JobPost\UpdateJobPostData;
use App\Models\JobPost;
use App\Models\User;
use App\Services\JobPost\JobPostService;
use Illuminate\Support\Facades\DB;

class UpdateJobPostAction
{
    public function __construct(private JobPostService $service) {}

    public function execute(User $user, int $id, UpdateJobPostData $data): JobPost
    {
        return DB::transaction(fn (): JobPost => $this->service->update($user, $id, $data));
    }
}
