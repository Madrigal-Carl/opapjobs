<?php

namespace App\Actions\Application;

use App\Models\Application;
use App\Models\User;
use App\Services\Application\ApplicationService;
use Illuminate\Support\Facades\DB;

class ShowApplicationAction
{
    public function __construct(private ApplicationService $service) {}

    public function execute(User $user, int $id): Application
    {
        return DB::transaction(fn (): Application => $this->service->show($user, $id));
    }
}
