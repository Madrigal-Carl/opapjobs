<?php

namespace App\Models\Concerns;

use App\Enums\DataScope;
use App\Models\User;
use App\Support\DataScopeResolver;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;

trait ScopedToUser
{
    /** @param Builder<static> $query */
    #[Scope]
    protected function visibleTo(Builder $query, User $user): void
    {
        match (DataScopeResolver::for($user)) {
            DataScope::All => null,
            DataScope::Agency => $this->applyAgencyScope($query, $user),
            DataScope::Own => $this->applyOwnScope($query, $user),
            DataScope::None => $query->whereRaw('1 = 0'),
        };
    }

    protected function agencyScopeColumn(): string
    {
        return 'agency_id';
    }

    protected function ownerScopeColumn(): string
    {
        return 'posted_by_user_id';
    }

    /** @param Builder<static> $query */
    protected function applyAgencyScope(Builder $query, User $user): void
    {
        $query->where($this->qualifyColumn($this->agencyScopeColumn()), $user->agency_id);
    }

    /** @param Builder<static> $query */
    protected function applyOwnScope(Builder $query, User $user): void
    {
        $this->applyAgencyScope($query, $user);
        $query->where($this->qualifyColumn($this->ownerScopeColumn()), $user->id);
    }
}
