<?php

namespace App\Actions\Employer;

use App\Data\Employer\StoreEmployerData;
use App\Models\Employer;
use App\Models\User;
use App\Services\Employer\EmployerService;
use Illuminate\Support\Facades\DB;

class StoreEmployerAction
{
    public function __construct(private EmployerService $service) {}

    public function execute(User $user, StoreEmployerData $data): Employer
    {
        return DB::transaction(fn (): Employer => $this->service->create($user, $data));
    }
}
