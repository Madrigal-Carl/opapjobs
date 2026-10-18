<?php

use App\Enums\Permission;
use App\Enums\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Role as RoleModel;

test('seeding creates exactly the four current roles and rejects the legacy role name', function () {
    expect(RoleModel::pluck('name')->all())
        ->toEqualCanonicalizing(['applicant', 'agency', 'admin', 'superadmin']);
    expect(Role::tryFrom('employer'))->toBeNull();
});

test('applicant role has the view agency profile permission', function () {
    $role = RoleModel::findByName(Role::Applicant->value);

    expect($role->hasPermissionTo(Permission::ViewAgencyProfile->value))->toBeTrue();
});

test('staff roles do not have the view agency profile permission', function (string $role) {
    $model = RoleModel::findByName($role);

    expect($model->hasPermissionTo(Permission::ViewAgencyProfile->value))->toBeFalse();
})->with([
    'agency' => [Role::Agency->value],
    'admin' => [Role::Admin->value],
    'superadmin' => [Role::Superadmin->value],
]);

test('an agency user cannot pass the view agency profile ability', function () {
    expect(User::factory()->agency()->create()
        ->can(Permission::ViewAgencyProfile->value))->toBeFalse();
});

test('staff roles can manage jobs with one permission', function (string $role) {
    expect(User::factory()->{$role}()->create()->can('managejob'))->toBeTrue();
})->with(['agency', 'admin', 'superadmin']);

test('applicants cannot manage jobs', function () {
    expect(User::factory()->applicant()->create()->can('managejob'))->toBeFalse();
});

test('superadmin passes the view agency profile ability through the superuser gate', function () {
    expect(User::factory()->superadmin()->create()
        ->can(Permission::ViewAgencyProfile->value))->toBeTrue();
});

test('applicants keep dashboard access permissions unchanged', function () {
    $role = RoleModel::findByName(Role::Applicant->value);

    expect($role->hasPermissionTo(Permission::AccessDashboard->value))->toBeFalse();
    expect($role->hasPermissionTo(Permission::ViewAgencyProfile->value))->toBeTrue();
});

test('the seeder remains idempotent', function () {
    $seeder = new RolesAndPermissionsSeeder;

    $seeder->run();
    $seeder->run();

    $role = RoleModel::findByName(Role::Applicant->value);
    expect($role->hasPermissionTo(Permission::ViewAgencyProfile->value))->toBeTrue();
});

test('agency dashboard permissions match the matrix', function () {
    $role = RoleModel::findByName(Role::Agency->value);

    expect($role->hasPermissionTo(Permission::AccessDashboard->value))->toBeTrue();
    expect($role->hasPermissionTo(Permission::ViewHiringOverview->value))->toBeTrue();
    expect($role->hasPermissionTo(Permission::ViewJobs->value))->toBeTrue();
    expect($role->hasPermissionTo(Permission::ViewApplications->value))->toBeTrue();
    expect($role->hasPermissionTo(Permission::ViewCandidates->value))->toBeTrue();

    expect($role->hasPermissionTo(Permission::ViewPlatformOverview->value))->toBeFalse();
    expect($role->hasPermissionTo(Permission::ViewSystemOverview->value))->toBeFalse();
    expect($role->hasPermissionTo(Permission::ViewAccounts->value))->toBeFalse();
});

test('admin dashboard permissions match the matrix', function () {
    $role = RoleModel::findByName(Role::Admin->value);

    expect($role->hasPermissionTo(Permission::AccessDashboard->value))->toBeTrue();
    expect($role->hasPermissionTo(Permission::ViewPlatformOverview->value))->toBeTrue();
    expect($role->hasPermissionTo(Permission::ViewJobs->value))->toBeTrue();
    expect($role->hasPermissionTo(Permission::ViewApplications->value))->toBeTrue();
    expect($role->hasPermissionTo(Permission::ViewCandidates->value))->toBeTrue();
    expect($role->hasPermissionTo(Permission::ViewAccounts->value))->toBeTrue();

    expect($role->hasPermissionTo(Permission::ViewHiringOverview->value))->toBeFalse();
    expect($role->hasPermissionTo(Permission::ViewSystemOverview->value))->toBeFalse();
});

test('superadmins have system overview dashboard permissions assigned directly', function () {
    $role = RoleModel::findByName(Role::Superadmin->value);

    $dashboardPermissions = [
        Permission::AccessDashboard,
        Permission::ViewSystemOverview,
        Permission::ViewJobs,
        Permission::ManageJob,
        Permission::ViewApplications,
        Permission::ViewCandidates,
        Permission::ViewAccounts,
    ];

    foreach ($dashboardPermissions as $permission) {
        expect($role->hasPermissionTo($permission->value))->toBeTrue("The superadmin role should have the [{$permission->value}] permission.");
    }

    expect($role->hasPermissionTo(Permission::ViewAgencyProfile->value))->toBeFalse();
});

test('superadmins pass every dashboard ability through the superuser gate', function (Permission $permission) {
    expect(User::factory()->superadmin()->create()
        ->can($permission->value))->toBeTrue();
})->with([
    Permission::AccessDashboard,
    Permission::ViewHiringOverview,
    Permission::ViewPlatformOverview,
    Permission::ViewSystemOverview,
    Permission::ViewJobs,
    Permission::ManageJob,
    Permission::ViewApplications,
    Permission::ViewCandidates,
    Permission::ViewAccounts,
]);

test('the shared auth props include the superadmin dashboard permissions', function () {
    $this->actingAs(User::factory()->superadmin()->create())
        ->get(route('dashboard.overview'))
        ->assertInertia(fn ($page) => $page->where(
            'auth.permissions',
            fn (Collection $permissions): bool => $permissions->contains(Permission::ViewSystemOverview->value)
                && ! $permissions->contains(Permission::ViewHiringOverview->value)
                && ! $permissions->contains(Permission::ViewPlatformOverview->value)
                && $permissions->contains(Permission::ViewJobs->value)
                && $permissions->contains(Permission::ManageJob->value)
                && $permissions->contains(Permission::ViewApplications->value)
                && $permissions->contains(Permission::ViewCandidates->value)
                && $permissions->contains(Permission::ViewAccounts->value)
                && $permissions->contains(Permission::AccessDashboard->value)
        ));
});
