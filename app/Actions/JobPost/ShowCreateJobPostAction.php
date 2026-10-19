<?php

namespace App\Actions\JobPost;

use App\Models\User;
use App\Services\JobPost\JobPostService;
use Illuminate\Support\Facades\DB;

class ShowCreateJobPostAction
{
    /**
     * Create a new class instance.
     */
    public function __construct(private JobPostService $service) {}

    /** @return array<string, mixed> */
    public function execute(User $user): array
    {
        return DB::transaction(fn (): array => $this->service->formData($user));
    }
}
