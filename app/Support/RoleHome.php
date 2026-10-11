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

        return $user?->can(Permission::AccessDashboard->value)
            ? route('dashboard.overview', absolute: false)
            : route('home', absolute: false);
    }
}
