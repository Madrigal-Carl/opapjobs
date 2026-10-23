<?php

use App\Models\User;
use App\Support\RoleHome;

test('guests are sent to the home page', function () {
    expect(RoleHome::pathFor(null))->toBe(route('home', absolute: false));
});

test('verified users without dashboard access are sent to the home page', function () {
    expect(RoleHome::pathFor(User::factory()->applicant()->create()))
        ->toBe(route('home', absolute: false));
});

test('staff are sent to the dashboard overview', function () {
    expect(RoleHome::pathFor(User::factory()->agency()->create()))
        ->toBe(route('dashboard.overview', absolute: false));
});

test('superadmins are sent to the console agencies list', function () {
    // The console has no overview screen, so the overview route is not
    // their home.
    expect(RoleHome::pathFor(User::factory()->superadmin()->create()))
        ->toBe(route('dashboard.system.agencies', absolute: false));
});

test('platform admins are still sent to the dashboard overview', function () {
    expect(RoleHome::pathFor(User::factory()->admin()->create()))
        ->toBe(route('dashboard.overview', absolute: false));
});

test('unverified users are sent to the verification notice', function () {
    expect(RoleHome::pathFor(User::factory()->unverified()->create()))
        ->toBe(route('verification.notice', absolute: false));
});

test('unverified staff are sent to the verification notice', function () {
    expect(RoleHome::pathFor(User::factory()->agency()->unverified()->create()))
        ->toBe(route('verification.notice', absolute: false));
});
