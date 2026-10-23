<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests can visit the agencies directory', function () {
    $this->get(route('agencies.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('agencies/index'));
});

test('guests are redirected to login from an agency profile', function () {
    $this->get(route('agencies.show', 'some-slug'))
        ->assertRedirect(route('login'));
});

test('applicants can visit the agencies directory', function () {
    $this->actingAs(User::factory()->applicant()->create())
        ->get(route('agencies.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('agencies/index'));
});

test('applicants can visit an agency profile with the slug prop', function () {
    $this->actingAs(User::factory()->applicant()->create())
        ->get(route('agencies.show', 'some-slug'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('agencies/show')
            ->where('slug', 'some-slug'));
});

test('staff are redirected from the agencies directory to their own home', function (string $state, string $home) {
    $this->actingAs(User::factory()->{$state}()->create())
        ->get(route('agencies.index'))
        ->assertRedirect(route($home, absolute: false));
})->with([
    'agency' => ['agency', 'dashboard.overview'],
    'admin' => ['admin', 'dashboard.overview'],
    // The console has no overview screen, so a superadmin's home is the
    // Agencies list itself.
    'superadmin' => ['superadmin', 'dashboard.system.agencies'],
]);

test('staff are redirected from an agency profile to their own home', function (string $state, string $home) {
    $this->actingAs(User::factory()->{$state}()->create())
        ->get(route('agencies.show', 'some-slug'))
        ->assertRedirect(route($home, absolute: false));
})->with([
    'agency' => ['agency', 'dashboard.overview'],
    'admin' => ['admin', 'dashboard.overview'],
    'superadmin' => ['superadmin', 'dashboard.system.agencies'],
]);

test('authenticated users without a role can visit the agencies directory but not an agency profile', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('agencies.index'))
        ->assertOk();

    $this->actingAs($user)
        ->get(route('agencies.show', 'some-slug'))
        ->assertForbidden();
});

test('a guest opening an agency profile returns to it after logging in as an applicant', function () {
    $url = route('agencies.show', 'some-slug');
    $applicant = User::factory()->applicant()->create();

    $this->get($url)->assertRedirect(route('login'));

    $this->post(route('login.store'), [
        'email' => $applicant->email,
        'password' => 'password',
    ])->assertRedirect($url);

    $this->get($url)->assertOk();
});

test('a guest opening an agency profile ends up on the dashboard after logging in as staff', function () {
    $url = route('agencies.show', 'some-slug');
    $agency = User::factory()->agency()->create();

    $this->get($url)->assertRedirect(route('login'));

    $this->post(route('login.store'), [
        'email' => $agency->email,
        'password' => 'password',
    ])->assertRedirect($url);

    $this->get($url)->assertRedirect(route('dashboard.overview', absolute: false));
});
