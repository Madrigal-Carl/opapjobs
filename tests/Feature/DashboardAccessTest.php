<?php

use App\Enums\Permission;
use App\Enums\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission as PermissionModel;
use Spatie\Permission\Models\Role as RoleModel;

$dashboardPages = [
    'overview' => 'dashboard.overview',
    'jobs' => 'dashboard.jobs',
    'new job' => 'dashboard.jobs.create',
    'applications' => 'dashboard.applications',
    'candidates' => 'dashboard.candidates',
    'accounts' => 'dashboard.accounts',
];

test('guests are redirected to login from every dashboard page', function (string $route) {
    $this->get(route($route))->assertRedirect(route('login'));
})->with($dashboardPages);

test('applicants are redirected home from every dashboard page', function (string $route) {
    $this->actingAs(User::factory()->applicant()->create())
        ->get(route($route))
        ->assertRedirect(route('home', absolute: false));
})->with($dashboardPages);

test('agencies can visit the jobs, applications and candidates pages', function (string $route) {
    $this->actingAs(User::factory()->agency()->create())
        ->get(route($route))
        ->assertOk();
})->with([
    'jobs' => 'dashboard.jobs',
    'applications' => 'dashboard.applications',
    'candidates' => 'dashboard.candidates',
]);

test('admins can visit the jobs, applications and candidates pages', function (string $route) {
    $this->actingAs(User::factory()->admin()->create())
        ->get(route($route))
        ->assertOk();
})->with([
    'jobs' => 'dashboard.jobs',
    'applications' => 'dashboard.applications',
    'candidates' => 'dashboard.candidates',
]);

test('agencies cannot visit the accounts page', function () {
    $this->actingAs(User::factory()->agency()->create())
        ->get(route('dashboard.accounts'))
        ->assertForbidden();
});

test('admins can visit the accounts page', function () {
    $this->actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.accounts'))
        ->assertOk();
});

test('superadmins can reach every dashboard page', function (string $route) {
    $this->actingAs(User::factory()->superadmin()->create())
        ->get(route($route))
        ->assertOk();
})->with($dashboardPages);

test('staff can open the new job form', function (string $role) {
    $this->actingAs(User::factory()->{$role}()->create())
        ->get(route('dashboard.jobs.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('dashboard/jobs/new'));
})->with(['agency', 'admin', 'superadmin']);

test('staff with only view jobs cannot open the new job form', function () {
    RoleModel::findByName(Role::Agency->value)->syncPermissions([
        Permission::AccessDashboard->value,
        Permission::ViewJobs->value,
    ]);
    $user = User::factory()->agency()->create();

    $this->actingAs($user)
        ->get(route('dashboard.jobs.create'))
        ->assertForbidden();
});

test('view only staff receive no job management capability', function () {
    RoleModel::findByName(Role::Agency->value)->syncPermissions([
        Permission::AccessDashboard->value,
        Permission::ViewJobs->value,
    ]);

    $this->actingAs(User::factory()->agency()->create())
        ->get(route('dashboard.jobs'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/jobs')
            ->where('canManageJobs', false)
        );
});

test('managejob authorizes the new job form without a separate add permission', function () {
    PermissionModel::findOrCreate('managejob', 'web');
    RoleModel::findByName(Role::Agency->value)->syncPermissions([
        Permission::AccessDashboard->value,
        'managejob',
    ]);

    $this->actingAs(User::factory()->agency()->create())
        ->get(route('dashboard.jobs.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('dashboard/jobs/new'));
});

test('job managers receive the management capability on the jobs page', function (string $role) {
    $this->actingAs(User::factory()->{$role}()->create())
        ->get(route('dashboard.jobs'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('canManageJobs', true));
})->with(['agency', 'admin', 'superadmin']);

test('the superadmin gate still grants job management without an assigned permission', function () {
    RoleModel::findByName(Role::Superadmin->value)->syncPermissions([
        Permission::AccessDashboard->value,
        Permission::ViewJobs->value,
    ]);
    $user = User::factory()->superadmin()->create();

    $this->actingAs($user)
        ->get(route('dashboard.jobs'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('canManageJobs', true));

    $this->get(route('dashboard.jobs.create'))->assertOk();
});

test('staff can open an application detail page', function (string $role) {
    $this->actingAs(User::factory()->{$role}()->create())
        ->get(route('dashboard.applications.show', 1))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/applications/show')
            ->where('applicationId', '1')
        );
})->with(['agency', 'admin', 'superadmin']);

test('guests are redirected to login from an application detail page', function () {
    $this->get(route('dashboard.applications.show', 1))
        ->assertRedirect(route('login'));
});

test('applicants are redirected home from an application detail page', function () {
    $this->actingAs(User::factory()->applicant()->create())
        ->get(route('dashboard.applications.show', 1))
        ->assertRedirect(route('home', absolute: false));
});
