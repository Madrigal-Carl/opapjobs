<?php

namespace App\Actions\Account;

use App\Data\Account\UpdateAccountData;
use App\Models\User;
use App\Services\Account\AccountService;
use Illuminate\Support\Facades\DB;

class UpdateAccountAction
{
    public function __construct(private AccountService $service) {}

    public function execute(User $actor, int $userId, UpdateAccountData $data): User
    {
        return DB::transaction(fn (): User => $this->service->update($actor, $userId, $data));
    }
}
