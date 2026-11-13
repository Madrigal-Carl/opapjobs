<?php

namespace App\Actions\Application;

use App\Models\User;
use App\Services\Application\ApplicationService;
use Illuminate\Support\Facades\DB;

class ReviewApplicationAction
{
    public function __construct(private ApplicationService $service) {}

    /** Returns whether the application moved to Reviewed; ineligible calls change nothing. */
    public function execute(User $user, int $id, string $ipAddress): bool
    {
        return DB::transaction(fn (): bool => $this->service->autoReview($user, $id, $ipAddress));
    }
}
