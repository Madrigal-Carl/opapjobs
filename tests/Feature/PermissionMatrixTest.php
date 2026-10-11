<?php

use App\Enums\Permission;
use App\Enums\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Spatie\Permission\Models\Role as RoleModel;

test('applicant role has the view agency profile permission', function () {
    $role = RoleModel::findByName(Role::Applicant->value);

    expect($role->hasPermissionTo(Permission::ViewAgencyProfile->value))->toBeTrue();
});

test('staff roles do not have the view agency profile permission', function (string $role) {
    $model = RoleModel::findByName($role);

    expect($model->hasPermissionTo(Permission::ViewAgencyProfile->value))->toBeFalse();
})->with([
    'employer' => [Role::Employer->value],
    'admin' => [Role::Admin->value],
    'superadmin' => [Role::Superadmin->value],
]);

test('an employer cannot pass the view agency profile ability', function () {
    expect(User::factory()->employer()->create()
        ->can(Permission::ViewAgencyProfile->value))->toBeFalse();
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
