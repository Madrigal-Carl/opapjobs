<?php

namespace App\Actions\Account;

use App\Data\Account\StoreAccountData;
use App\Models\User;
use App\Services\Account\AccountService;
use Illuminate\Support\Facades\DB;

class StoreAccountAction
{
    public function __construct(private AccountService $service) {}

    public function execute(User $actor, StoreAccountData $data): User
    {
        return DB::transaction(fn (): User => $this->service->create($actor, $data));
    }
}
