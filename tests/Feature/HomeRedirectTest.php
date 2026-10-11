<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests can visit the home page', function () {
    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('home'));
});

test('applicants can visit the home page', function () {
    $this->actingAs(User::factory()->applicant()->create())
        ->get(route('home'))
        ->assertOk();
});

test('staff are redirected from the home page to the dashboard overview', function () {
    $this->actingAs(User::factory()->employer()->create())
        ->get(route('home'))
        ->assertRedirect(route('dashboard.overview', absolute: false));
});
