<?php

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::emailVerification());
});

test('email verification screen can be rendered', function () {
    $user = User::factory()->unverified()->create();

    $response = $this->actingAs($user)->get(route('verification.notice'));

    $response->assertOk();
});

test('unverified users are redirected to the email verification prompt', function () {
    $user = User::factory()->unverified()->create();

    $response = $this->actingAs($user)->get(route('profile.edit'));

    $response->assertRedirect(route('verification.notice'));
});

test('unverified applicants can visit the public pages', function () {
    $user = User::factory()->applicant()->unverified()->create();

    $this->actingAs($user)->get(route('home'))->assertOk();
    $this->actingAs($user)->get(route('agencies.index'))->assertOk();
});

test('unverified applicants are redirected from an agency profile to the email verification prompt', function () {
    $user = User::factory()->applicant()->unverified()->create();

    $this->actingAs($user)
        ->get(route('agencies.show', 'some-slug'))
        ->assertRedirect(route('verification.notice'));
});

test('unverified users are redirected to the email verification prompt from every role-restricted route', function (string $route) {
    $user = User::factory()->applicant()->unverified()->create();

    $this->actingAs($user)
        ->get(route($route, $route === 'agencies.show' ? 'some-slug' : []))
        ->assertRedirect(route('verification.notice'));
})->with([
    'dashboard',
    'dashboard.overview',
    'agencies.show',
    'profile.edit',
]);

test('unverified applicants can open an agency profile after verifying their email', function () {
    $user = User::factory()->applicant()->unverified()->create();
    $profileUrl = route('agencies.show', 'some-slug');

    $this->actingAs($user)->get($profileUrl)->assertRedirect(route('verification.notice'));

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1($user->email)],
    );

    $this->actingAs($user)->get($verificationUrl);

    $this->actingAs($user)
        ->get($profileUrl)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('agencies/show'));
});

test('email can be verified', function () {
    $user = User::factory()->unverified()->create();

    Event::fake();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1($user->email)],
    );

    $response = $this->actingAs($user)->get($verificationUrl);

    Event::assertDispatched(Verified::class);

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
    $response->assertRedirect(route('home', absolute: false).'?verified=1');
});

test('email is not verified with invalid hash', function () {
    $user = User::factory()->unverified()->create();

    Event::fake();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1('wrong-email')],
    );

    $this->actingAs($user)->get($verificationUrl);

    Event::assertNotDispatched(Verified::class);
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('email is not verified with invalid user id', function () {
    $user = User::factory()->unverified()->create();

    Event::fake();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => 123, 'hash' => sha1($user->email)],
    );

    $this->actingAs($user)->get($verificationUrl);

    Event::assertNotDispatched(Verified::class);
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('email is not verified with an unsigned url', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->get(route('verification.verify', ['id' => $user->id, 'hash' => sha1($user->email)]))
        ->assertForbidden();

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('email is not verified with an expired signed url', function () {
    $user = User::factory()->unverified()->create();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->subMinute(),
        ['id' => $user->id, 'hash' => sha1($user->email)],
    );

    $this->actingAs($user)->get($verificationUrl)->assertForbidden();

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('staff email verification is redirected to the dashboard overview', function () {
    $user = User::factory()->employer()->unverified()->create();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1($user->email)],
    );

    $this->actingAs($user)
        ->get($verificationUrl)
        ->assertRedirect(route('dashboard.overview', absolute: false).'?verified=1');
});

test('verified user is redirected to dashboard from verification prompt', function () {
    $user = User::factory()->create();

    Event::fake();

    $response = $this->actingAs($user)->get(route('verification.notice'));

    Event::assertNotDispatched(Verified::class);
    $response->assertRedirect(route('home', absolute: false));
});

test('already verified user visiting verification link is redirected without firing event again', function () {
    $user = User::factory()->create();

    Event::fake();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1($user->email)],
    );

    $this->actingAs($user)->get($verificationUrl)
        ->assertRedirect(route('home', absolute: false).'?verified=1');

    Event::assertNotDispatched(Verified::class);
    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
});
