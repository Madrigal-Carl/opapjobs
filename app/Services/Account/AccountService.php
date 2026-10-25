<?php

namespace App\Services\Account;

use App\Data\Account\StoreAccountData;
use App\Data\Account\UpdateAccountData;
use App\Enums\DataScope;
use App\Enums\Role;
use App\Events\StaffAccountCreated;
use App\Exceptions\Account\AccountLimitReachedException;
use App\Exceptions\Account\AgencyRequiredException;
use App\Exceptions\Account\DuplicateAccountEmailException;
use App\Exceptions\Account\DuplicateEmployeeIdException;
use App\Models\User;
use App\Repositories\Account\AccountRepository;
use App\Repositories\AuditLogRepository;
use App\Support\AccountIndexFilters;
use App\Support\DataScopeResolver;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AccountService
{
    public function __construct(
        private AccountRepository $accounts,
        private AuditLogRepository $auditLogs,
    ) {}

    /** @return array{staff: ?LengthAwarePaginator<int, User>, kpis: ?array{total_staff: int, active: int, suspended: int, jobs_created: int}, seats: ?array{used: int, limit: int}} */
    public function list(User $user, AccountIndexFilters $filters, bool $includeStaff, bool $includeKpis, bool $includeSeats): array
    {
        if ($user->agency_id === null) {
            return ['staff' => null, 'kpis' => null, 'seats' => null];
        }

        $agencyId = (int) $user->agency_id;

        return [
            'staff' => $includeStaff ? $this->accounts->paginateForAgency($agencyId, $filters) : null,
            'kpis' => $includeKpis ? $this->accounts->kpisForAgency($agencyId) : null,
            'seats' => $includeSeats ? [
                'used' => $this->accounts->seatCountForAgency($agencyId),
                'limit' => $this->accounts->agencyUserLimit($agencyId),
            ] : null,
        ];
    }

    public function create(User $actor, StoreAccountData $data): User
    {
        if ($actor->agency_id === null) {
            throw new AgencyRequiredException;
        }

        $agency = $this->accounts->lockAgency((int) $actor->agency_id);

        if ($this->accounts->emailExists($data->email)) {
            throw new DuplicateAccountEmailException;
        }

        if ($this->accounts->employeeIdExistsInAgency($agency->id, $data->employeeId)) {
            throw new DuplicateEmployeeIdException;
        }

        if ($agency->agency_user_limit > 0 && $this->accounts->seatCountForAgency($agency->id) >= $agency->agency_user_limit) {
            throw new AccountLimitReachedException;
        }

        $user = User::query()->create([
            'name' => trim($data->name),
            'email' => mb_strtolower(trim($data->email)),
            'password' => Hash::make(Str::random(32)),
            'agency_id' => $agency->id,
            'created_by_user_id' => $actor->id,
        ]);

        $user->forceFill(['email_verified_at' => now()])->save();

        $user->syncRoles([Role::Agency->value]);
        $user->staffProfile()->create([
            'employee_id' => trim($data->employeeId),
            'phone' => $this->nullable($data->phone),
            'notes' => $this->notes($data->notes),
        ]);

        $this->auditLogs->log($actor, 'account.created', $user, ['name', 'email', 'employee_id'], $data->ipAddress);
        StaffAccountCreated::dispatch($user);

        return $user;
    }

    public function update(User $actor, int $userId, UpdateAccountData $data): User
    {
        if ($actor->agency_id === null) {
            throw new AgencyRequiredException;
        }

        $user = $this->accounts->findVisibleForUpdate((int) $actor->agency_id, $userId);

        if ($this->accounts->emailExists($data->email, $user->id)) {
            throw new DuplicateAccountEmailException;
        }

        if ($this->accounts->employeeIdExistsInAgency((int) $actor->agency_id, $data->employeeId, $user->id)) {
            throw new DuplicateEmployeeIdException;
        }

        $changed = [];
        $attributes = [];

        if ($user->name !== trim($data->name)) {
            $attributes['name'] = trim($data->name);
            $changed[] = 'name';
        }

        $email = mb_strtolower(trim($data->email));
        if ($user->email !== $email) {
            $attributes['email'] = $email;
            $changed[] = 'email';
        }

        if ($attributes !== []) {
            $user->forceFill($attributes)->save();
        }

        $profile = $user->staffProfile;
        $phone = $this->nullable($data->phone);
        $notes = $this->notes($data->notes);
        $employeeId = trim($data->employeeId);

        foreach (['employee_id' => $employeeId, 'phone' => $phone, 'notes' => $notes] as $field => $value) {
            if ($profile?->{$field} !== $value) {
                $changed[] = $field;
            }
        }

        $user->staffProfile()->updateOrCreate([], ['employee_id' => $employeeId, 'phone' => $phone, 'notes' => $notes]);

        if ($changed !== []) {
            $this->auditLogs->log($actor, 'account.updated', $user, $changed, $data->ipAddress);
        }

        return $user->load('staffProfile');
    }

    public function changeStatus(User $actor, int $userId, string $status, string $ipAddress): User
    {
        if ($actor->agency_id === null) {
            throw new AgencyRequiredException;
        }

        $user = $this->accounts->findVisibleForUpdate((int) $actor->agency_id, $userId);

        if ($status === 'suspended' && $user->suspended_at === null) {
            $user->forceFill(['suspended_at' => now()])->save();
            $this->accounts->deleteSessionsFor($user->id);
            $this->auditLogs->log($actor, 'account.suspended', $user, [], $ipAddress);
        }

        if ($status === 'active' && $user->suspended_at !== null) {
            $user->forceFill(['suspended_at' => null])->save();
            $this->auditLogs->log($actor, 'account.reactivated', $user, [], $ipAddress);
        }

        return $user->load('staffProfile');
    }

    public function archive(User $actor, int $userId, string $ipAddress): User
    {
        if (DataScopeResolver::for($actor) !== DataScope::Agency) {
            throw new AgencyRequiredException;
        }

        $agency = $this->accounts->lockAgency((int) $actor->agency_id);
        $user = $this->accounts->findVisibleForUpdate($agency->id, $userId);

        $user->delete();
        $this->accounts->deleteSessionsFor($user->id);
        $this->auditLogs->log($actor, 'account.archived', $user, [], $ipAddress);

        return $user;
    }

    private function nullable(?string $value): ?string
    {
        $value = $value === null ? null : trim($value);

        return $value === '' ? null : $value;
    }

    private function notes(?string $value): ?string
    {
        $value = $this->nullable($value);

        return $value === null ? null : mb_substr($value, 0, 1000);
    }
}
