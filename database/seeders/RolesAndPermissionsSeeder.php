<?php

namespace Database\Seeders;

use App\Enums\Permission;
use App\Enums\Role;
use Illuminate\Database\Seeder;
use Spatie\Permission\Contracts\Permission as PermissionContract;
use Spatie\Permission\Models\Permission as PermissionModel;
use Spatie\Permission\Models\Role as RoleModel;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Seed the application's roles and permissions.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [];

        foreach (Permission::cases() as $permission) {
            $permissions[$permission->value] = PermissionModel::findOrCreate($permission->value, 'web');
        }

        $roles = collect(Role::cases())
            ->mapWithKeys(fn (Role $role): array => [
                $role->value => RoleModel::findOrCreate($role->value, 'web'),
            ]);

        // Only the system overview is exposed to superadmins in the UI;
        // the superuser gate still grants the other overview abilities.
        $matrix = [
            Role::Applicant->value => [
                Permission::ViewAgencyProfile,
            ],
            Role::Agency->value => [
                Permission::AccessDashboard,
                Permission::ViewHiringOverview,
                Permission::ViewJobs,
                Permission::ManageJob,
                Permission::ViewApplications,
                Permission::ManageApplications,
                Permission::ViewCandidates,
            ],
            Role::Admin->value => [
                Permission::AccessDashboard,
                Permission::ViewPlatformOverview,
                Permission::ViewJobs,
                Permission::ManageJob,
                Permission::ViewApplications,
                Permission::ManageApplications,
                Permission::ViewCandidates,
                Permission::ViewAccounts,
                Permission::ManageAccounts,
            ],
            Role::Superadmin->value => [
                Permission::AccessDashboard,
                Permission::ViewSystemOverview,
                Permission::ViewJobs,
                Permission::ManageJob,
                Permission::ViewApplications,
                Permission::ManageApplications,
                Permission::ViewCandidates,
                Permission::ViewAccounts,
                Permission::ManageAccounts,
            ],
        ];

        foreach ($matrix as $roleValue => $permissionEnums) {
            $roles[$roleValue]->syncPermissions(
                array_map(
                    fn (Permission $permission): PermissionContract => $permissions[$permission->value],
                    $permissionEnums,
                )
            );
        }
    }
}
