<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $this->get(route('dashboard'))->assertRedirect(route('login'));
});

test('guests cannot access the dashboard overview', function () {
    $this->get(route('dashboard.overview'))->assertRedirect(route('login'));
});

test('applicants are redirected home from the dashboard', function () {
    $this->actingAs(User::factory()->applicant()->create())
        ->get(route('dashboard'))
        ->assertRedirect(route('home', absolute: false));
});

test('applicants are redirected home from the dashboard overview', function () {
    $this->actingAs(User::factory()->applicant()->create())
        ->get(route('dashboard.overview'))
        ->assertRedirect(route('home', absolute: false));
});

test('applicants requesting the dashboard overview as json receive 403', function () {
    $this->actingAs(User::factory()->applicant()->create())
        ->getJson(route('dashboard.overview'))
        ->assertForbidden();
});

test('staff are redirected from the dashboard to the overview', function () {
    $this->actingAs(User::factory()->agency()->create())
        ->get(route('dashboard'))
        ->assertRedirect(route('dashboard.overview', absolute: false));
});

test('agencies see the hiring overview', function () {
    $this->actingAs(User::factory()->agency()->create())
        ->get(route('dashboard.overview'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('dashboard/overview/hiring'));
});

test('admins see the platform overview', function () {
    $this->actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.overview'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('dashboard/overview/platform'));
});

test('superadmins see the system overview', function () {
    $this->actingAs(User::factory()->superadmin()->create())
        ->get(route('dashboard.overview'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('dashboard/overview/system'));
});
