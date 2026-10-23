<?php

namespace App\Support;

use App\Enums\Permission;
use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;

class RoleHome
{
    public static function pathFor(?User $user): string
    {
        if ($user instanceof MustVerifyEmail && ! $user->hasVerifiedEmail()) {
            return route('verification.notice', absolute: false);
        }

        return match (true) {
            // The console has no overview screen of its own, so a
            // superadmin's home is the Agencies list. Checked before the
            // dashboard gate below: the superuser gate makes a superadmin
            // pass every ability, and this is the one no other role holds.
            $user?->can(Permission::ViewSystemOverview->value) => route(
                'dashboard.system.agencies',
                absolute: false,
            ),
            $user?->can(Permission::AccessDashboard->value) => route('dashboard.overview', absolute: false),
            default => route('home', absolute: false),
        };
    }
}
