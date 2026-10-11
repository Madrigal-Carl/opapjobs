<?php

namespace App\Support;

use App\Enums\Permission;
use App\Models\User;

class RoleHome
{
    public static function pathFor(?User $user): string
    {
        return $user?->can(Permission::AccessDashboard->value)
            ? route('dashboard.overview', absolute: false)
            : route('home', absolute: false);
    }
}
