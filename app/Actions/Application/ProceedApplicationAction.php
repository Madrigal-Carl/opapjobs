<?php

namespace App\Actions\Application;

use App\Enums\ApplicationStage;
use App\Models\User;
use App\Services\Application\ApplicationService;
use Illuminate\Support\Facades\DB;

class ProceedApplicationAction
{
    public function __construct(private ApplicationService $service) {}

    public function execute(User $user, int $id, string $ipAddress): ApplicationStage
    {
        return DB::transaction(fn (): ApplicationStage => $this->service->proceed($user, $id, $ipAddress));
    }
}
