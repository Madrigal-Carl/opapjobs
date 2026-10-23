<?php

namespace App\Actions\JobPost;

use App\Models\User;
use App\Services\JobPost\JobPostService;

class ShowEditJobPostAction
{
    public function __construct(private JobPostService $service) {}

    /** @return array<string, mixed> */
    public function execute(User $user, int $id): array
    {
        return $this->service->editFormData($user, $id);
    }
}
