<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests can browse the jobs directory', function () {
    $this->get(route('jobs.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('jobs/index'));
});

test('guests can view a job opening', function () {
    $this->get(route('jobs.show', 'land-1'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('jobs/show')
            ->where('jobId', 'land-1'));
});

test('guests can visit the contact page', function () {
    $this->get(route('contact'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('contact'));
});

test('applicants can browse jobs and view an opening', function () {
    $applicant = User::factory()->applicant()->create();

    $this->actingAs($applicant)
        ->get(route('jobs.index'))
        ->assertOk();

    $this->actingAs($applicant)
        ->get(route('jobs.show', 'land-1'))
        ->assertOk();
});

test('guests are redirected to login from the resume', function () {
    $this->get(route('resume'))
        ->assertRedirect(route('login'));
});

test('guests are redirected to login from my jobs', function () {
    $this->get(route('applications'))
        ->assertRedirect(route('login'));
});

test('guests are redirected to login from the apply wizard', function () {
    $this->get(route('jobs.apply', 'land-1'))
        ->assertRedirect(route('login'));
});

test('applicants can open the resume, my jobs and the apply wizard', function () {
    $applicant = User::factory()->applicant()->create();

    $this->actingAs($applicant)
        ->get(route('resume'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('applicant/resume'));

    $this->actingAs($applicant)
        ->get(route('applications'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('applicant/applications'));

    $this->actingAs($applicant)
        ->get(route('jobs.apply', 'land-1'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('jobs/apply')
            ->where('jobId', 'land-1'));
});

test('unverified applicants are sent to verify their email before applying', function () {
    $applicant = User::factory()->unverified()->applicant()->create();

    $this->actingAs($applicant)
        ->get(route('jobs.apply', 'land-1'))
        ->assertRedirect(route('verification.notice'));
});

test('staff are redirected from the applicant pages to the dashboard overview', function (string $state, string $routeName) {
    $url = $routeName === 'jobs.apply'
        ? route('jobs.apply', 'land-1')
        : route($routeName);

    $this->actingAs(User::factory()->{$state}()->create())
        ->get($url)
        ->assertRedirect(route('dashboard.overview', absolute: false));
})->with([
    ['employer', 'jobs.index'],
    ['employer', 'contact'],
    ['employer', 'resume'],
    ['employer', 'applications'],
    ['employer', 'jobs.apply'],
    ['admin', 'jobs.index'],
    ['admin', 'resume'],
    ['superadmin', 'jobs.index'],
    ['superadmin', 'applications'],
    ['superadmin', 'jobs.apply'],
]);

test('applicants never land in the dashboard', function () {
    $this->actingAs(User::factory()->applicant()->create())
        ->get(route('dashboard'))
        ->assertRedirect(route('home', absolute: false));
});

test('a guest applying is returned to the wizard after signing in', function () {
    $url = route('jobs.apply', 'land-1');
    $applicant = User::factory()->applicant()->create();

    $this->get($url)->assertRedirect(route('login'));

    $this->post(route('login.store'), [
        'email' => $applicant->email,
        'password' => 'password',
    ])->assertRedirect($url);

    $this->get($url)->assertOk();
});
