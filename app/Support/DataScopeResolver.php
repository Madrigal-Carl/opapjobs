<?php

namespace App\Support;

use App\Enums\DataScope;
use App\Enums\Permission;
use App\Models\User;

/**
 * The permission ladder is intentionally centralized so dedicated scope
 * permissions can replace overview permissions later without changing callers.
 */
class DataScopeResolver
{
    public static function for(?User $user): DataScope
    {
        $scope = match (true) {
            $user?->can(Permission::ViewSystemOverview->value) ?? false => DataScope::All,
            $user?->can(Permission::ViewPlatformOverview->value) ?? false => DataScope::Agency,
            $user?->can(Permission::ViewHiringOverview->value) ?? false => DataScope::Own,
            default => DataScope::None,
        };

        if (in_array($scope, [DataScope::Own, DataScope::Agency], true) && $user->agency_id === null) {
            return DataScope::None;
        }

        return $scope;
    }
}
