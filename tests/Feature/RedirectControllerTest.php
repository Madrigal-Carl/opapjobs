<?php

use App\Models\User;

test('guests are redirected to login from the dashboard index', function () {
    $this->get(route('dashboard'))->assertRedirect(route('login'));
});

test('the dashboard index redirects applicants home', function () {
    $this->actingAs(User::factory()->applicant()->create())
        ->get(route('dashboard'))
        ->assertRedirect(route('home', absolute: false));
});

test('the dashboard index redirects staff to their own home', function (string $state, string $home) {
    $this->actingAs(User::factory()->{$state}()->create())
        ->get(route('dashboard'))
        ->assertRedirect(route($home, absolute: false));
})->with([
    'agency' => ['agency', 'dashboard.overview'],
    'admin' => ['admin', 'dashboard.overview'],
    // A superadmin's home is the console's Agencies list: the console
    // has no overview screen of its own.
    'superadmin' => ['superadmin', 'dashboard.system.agencies'],
]);

test('the settings index redirects staff to the profile page', function () {
    $this->actingAs(User::factory()->admin()->create())
        ->get('settings')
        ->assertRedirect(route('profile.edit', absolute: false));
});

test('staff have access to agent settings routes', function () {
    $this->actingAs(User::factory()->admin()->create())
        ->get(route('profile.edit'))
        ->assertOk();
});
