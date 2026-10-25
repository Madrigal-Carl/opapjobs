<?php

namespace App\Actions\Account;

use App\Models\User;
use App\Services\Account\AccountService;
use App\Support\AccountIndexFilters;
use Illuminate\Support\Facades\DB;

class ListAccountsAction
{
    public function __construct(private AccountService $service) {}

    /** @return array<string, mixed> */
    public function execute(User $user, AccountIndexFilters $filters, bool $includeStaff = true, bool $includeKpis = false, bool $includeSeats = true): array
    {
        return DB::transaction(fn (): array => $this->service->list($user, $filters, $includeStaff, $includeKpis, $includeSeats));
    }
}
