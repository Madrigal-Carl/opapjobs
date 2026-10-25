<?php

namespace App\Actions\Account;

use App\Models\User;
use App\Services\Account\AccountService;
use Illuminate\Support\Facades\DB;

class ChangeAccountStatusAction
{
    public function __construct(private AccountService $service) {}

    public function execute(User $actor, int $userId, string $status, string $ipAddress): User
    {
        return DB::transaction(fn (): User => $this->service->changeStatus($actor, $userId, $status, $ipAddress));
    }
}
