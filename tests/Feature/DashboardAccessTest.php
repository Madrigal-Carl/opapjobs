<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

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

test('employers can visit the jobs, applications and candidates pages', function (string $route) {
    $this->actingAs(User::factory()->employer()->create())
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

test('employers cannot visit the accounts page', function () {
    $this->actingAs(User::factory()->employer()->create())
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
})->with(['employer', 'admin', 'superadmin']);

test('staff can open an application detail page', function (string $role) {
    $this->actingAs(User::factory()->{$role}()->create())
        ->get(route('dashboard.applications.show', 1))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/applications/show')
            ->where('applicationId', '1')
        );
})->with(['employer', 'admin', 'superadmin']);

test('guests are redirected to login from an application detail page', function () {
    $this->get(route('dashboard.applications.show', 1))
        ->assertRedirect(route('login'));
});

test('applicants are redirected home from an application detail page', function () {
    $this->actingAs(User::factory()->applicant()->create())
        ->get(route('dashboard.applications.show', 1))
        ->assertRedirect(route('home', absolute: false));
});
