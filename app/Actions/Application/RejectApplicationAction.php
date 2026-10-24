<?php

namespace App\Actions\Application;

use App\Enums\ApplicationStage;
use App\Models\User;
use App\Services\Application\ApplicationService;
use Illuminate\Support\Facades\DB;

class RejectApplicationAction
{
    public function __construct(private ApplicationService $service) {}

    public function execute(User $user, int $id, string $ipAddress, ?string $note = null): ApplicationStage
    {
        return DB::transaction(fn (): ApplicationStage => $this->service->reject($user, $id, $ipAddress, $note));
    }
}
