<?php

namespace App\Repositories\Account;

use App\Enums\Role;
use App\Models\Agency;
use App\Models\User;
use App\Support\AccountIndexFilters;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class AccountRepository
{
    /** @return LengthAwarePaginator<int, User> */
    public function paginateForAgency(int $agencyId, AccountIndexFilters $filters): LengthAwarePaginator
    {
        $query = User::query()
            ->with('staffProfile')
            ->withCount('jobPostsPosted')
            ->where('agency_id', $agencyId)
            ->role(Role::Agency->value)
            ->whereNull('deleted_at');

        if ($filters->q !== null) {
            $term = '%'.mb_strtolower($filters->q).'%';

            $query->where(function ($sub) use ($term): void {
                $sub->whereRaw('lower(users.name) like ?', [$term])
                    ->orWhereRaw('lower(users.email) like ?', [$term])
                    ->orWhereHas('staffProfile', fn ($profile) => $profile->whereRaw('lower(employee_id) like ?', [$term]));
            });
        }

        match ($filters->status) {
            'active' => $query->whereNull('suspended_at'),
            'suspended' => $query->whereNotNull('suspended_at'),
            default => null,
        };

        return $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($filters->perPage, ['*'], 'page', $filters->page)
            ->withQueryString();
    }

    /** @return array{total_staff: int, active: int, suspended: int, jobs_created: int} */
    public function kpisForAgency(int $agencyId): array
    {
        $base = fn () => User::query()
            ->where('agency_id', $agencyId)
            ->role(Role::Agency->value)
            ->whereNull('deleted_at');

        return [
            'total_staff' => $base()->count(),
            'active' => $base()->whereNull('suspended_at')->count(),
            'suspended' => $base()->whereNotNull('suspended_at')->count(),
            'jobs_created' => (int) $base()->withCount('jobPostsPosted')->get()->sum('job_posts_posted_count'),
        ];
    }

    public function seatCountForAgency(int $agencyId): int
    {
        return User::query()
            ->where('agency_id', $agencyId)
            ->role(Role::Agency->value)
            ->whereNull('deleted_at')
            ->count();
    }

    public function lockAgency(int $agencyId): Agency
    {
        return Agency::query()->whereKey($agencyId)->lockForUpdate()->firstOrFail();
    }

    public function agencyUserLimit(int $agencyId): int
    {
        return (int) Agency::query()->whereKey($agencyId)->value('agency_user_limit');
    }

    public function findVisibleForUpdate(int $agencyId, int $userId): User
    {
        return User::query()
            ->with('staffProfile')
            ->where('agency_id', $agencyId)
            ->role(Role::Agency->value)
            ->whereNull('deleted_at')
            ->lockForUpdate()
            ->findOrFail($userId);
    }

    public function emailExists(string $email, ?int $excludeUserId = null): bool
    {
        return User::withTrashed()
            ->whereRaw('lower(email) = ?', [mb_strtolower(trim($email))])
            ->when($excludeUserId !== null, fn ($query) => $query->whereKeyNot($excludeUserId))
            ->exists();
    }

    public function employeeIdExistsInAgency(int $agencyId, string $employeeId, ?int $excludeUserId = null): bool
    {
        return User::query()
            ->join('staff_profiles', 'staff_profiles.user_id', '=', 'users.id')
            ->where('users.agency_id', $agencyId)
            ->whereNull('users.deleted_at')
            ->whereRaw('lower(staff_profiles.employee_id) = ?', [mb_strtolower(trim($employeeId))])
            ->when($excludeUserId !== null, fn ($query) => $query->where('users.id', '!=', $excludeUserId))
            ->exists();
    }

    public function deleteSessionsFor(int $userId): void
    {
        DB::table('sessions')->where('user_id', $userId)->delete();
    }
}
