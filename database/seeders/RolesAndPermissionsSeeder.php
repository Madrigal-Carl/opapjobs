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

        // Superadmins pass every ability through the superuser gate, but the
        // sidebar only sees the directly assigned permissions, so every
        // dashboard permission is still assigned to them explicitly.
        $matrix = [
            Role::Applicant->value => [
                Permission::ViewAgencyProfile,
            ],
            Role::Employer->value => [
                Permission::AccessDashboard,
                Permission::ViewHiringOverview,
                Permission::ViewJobs,
                Permission::ManageJob,
                Permission::ViewApplications,
                Permission::ViewCandidates,
            ],
            Role::Admin->value => [
                Permission::AccessDashboard,
                Permission::ViewPlatformOverview,
                Permission::ViewJobs,
                Permission::ManageJob,
                Permission::ViewApplications,
                Permission::ViewCandidates,
                Permission::ViewAccounts,
            ],
            Role::Superadmin->value => [
                Permission::AccessDashboard,
                Permission::ViewHiringOverview,
                Permission::ViewPlatformOverview,
                Permission::ViewSystemOverview,
                Permission::ViewJobs,
                Permission::ManageJob,
                Permission::ViewApplications,
                Permission::ViewCandidates,
                Permission::ViewAccounts,
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
