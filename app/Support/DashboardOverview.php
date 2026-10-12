<?php

namespace App\Support;

use App\Enums\Permission;
use App\Models\User;

class DashboardOverview
{
    /**
     * Resolve the dashboard overview component for a user.
     *
     * The order matters: superadmins pass every ability through the
     * superuser gate, so the system overview is checked first, then
     * the platform overview, then the hiring overview.
     */
    public static function componentFor(?User $user): ?string
    {
        if ($user?->can(Permission::ViewSystemOverview->value)) {
            return 'dashboard/overview/system';
        }

        if ($user?->can(Permission::ViewPlatformOverview->value)) {
            return 'dashboard/overview/platform';
        }

        if ($user?->can(Permission::ViewHiringOverview->value)) {
            return 'dashboard/overview/hiring';
        }

        return null;
    }
}
