<?php

namespace Database\Seeders;

use App\Enums\Permission;
use App\Enums\Role;
use Illuminate\Database\Seeder;
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

        $accessDashboard = PermissionModel::findOrCreate(Permission::AccessDashboard->value, 'web');
        $viewAgencyProfile = PermissionModel::findOrCreate(Permission::ViewAgencyProfile->value, 'web');

        $roles = collect(Role::cases())
            ->mapWithKeys(fn (Role $role): array => [
                $role->value => RoleModel::findOrCreate($role->value, 'web'),
            ]);

        $roles[Role::Applicant->value]->syncPermissions([$viewAgencyProfile]);

        foreach ([Role::Employer, Role::Admin, Role::Superadmin] as $role) {
            $roles[$role->value]->syncPermissions([$accessDashboard]);
        }
    }
}
