<?php

namespace App\Actions\JobPost;

use App\Enums\JobPostStatus;
use App\Models\User;
use App\Services\JobPost\JobPostService;
use Illuminate\Support\Facades\DB;

class ChangeJobPostStatusAction
{
    public function __construct(private JobPostService $service) {}

    public function execute(User $user, int $id, string $ipAddress, bool $archive = false): JobPostStatus
    {
        return DB::transaction(fn (): JobPostStatus => $this->service->changeStatus($user, $id, $ipAddress, $archive));
    }
}
