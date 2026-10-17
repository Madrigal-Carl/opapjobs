<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Route;

beforeEach(function (): void {
    $this->applicant = User::factory()->applicant()->create();
    $this->superadmin = User::factory()->superadmin()->create();
});

/** Pages a signed-out visitor may read without an account. */
dataset('publicPages', [
    'jobs index' => ['/jobs'],
    'job detail' => ['/job/land-1'],
    'contact' => ['/contact'],
]);

/** Pages that only make sense once there is somebody to apply as. */
dataset('protectedPages', [
    'apply' => ['/job/land-1/apply'],
    'resume' => ['/resume'],
    'my jobs' => ['/applications'],
]);

it('shows the public applicant pages to guests', function (string $path): void {
    $this->get($path)->assertOk();
})->with('publicPages');

it('shows the public applicant pages to applicants', function (string $path): void {
    $this->actingAs($this->applicant)->get($path)->assertOk();
})->with('publicPages');

it('sends guests to sign in before an applicant-only page', function (string $path): void {
    $this->get($path)->assertRedirect(route('login'));
})->with('protectedPages');

it('lets applicants reach the applicant-only pages', function (string $path): void {
    $this->actingAs($this->applicant)->get($path)->assertOk();
})->with('protectedPages');

/** Every applicant-facing URL, public or not. */
dataset('allApplicantPages', [
    'jobs index' => ['/jobs'],
    'job detail' => ['/job/land-1'],
    'apply' => ['/job/land-1/apply'],
    'resume' => ['/resume'],
    'my jobs' => ['/applications'],
    'contact' => ['/contact'],
]);

/**
 * Staff must never land on an applicant page: the `redirect.staff`
 * middleware sends them to the dashboard instead, so the agency side cannot
 * be driven from a public link.
 */
it('sends the superadmin away from every applicant page', function (string $path): void {
    $this->actingAs($this->superadmin)
        ->get($path)
        ->assertRedirect();
})->with('allApplicantPages');

/** Applicants must never land in the dashboard. */
it('keeps applicants out of the dashboard', function (): void {
    $this->actingAs($this->applicant)
        ->get('/dashboard')
        ->assertRedirect();
});

/** A listing that no longer exists still renders a page rather than a 500. */
it('renders the job page for an unknown listing', function (): void {
    $this->get('/job/does-not-exist')->assertOk();
});

/** Every applicant page is a named route, so links can point at it. */
it('names every applicant route', function (): void {
    $names = collect(Route::getRoutes())
        ->map(fn ($route) => $route->getName())
        ->filter()
        ->values();

    expect($names)
        ->toContain(
            'jobs.index',
            'jobs.show',
            'jobs.apply',
            'resume',
            'applications',
            'contact',
        );
});

/**
 * Applicant pages are authorised by authentication alone. No agency
 * permission grants access to them, so a new role cannot accidentally
 * inherit a way to read an applicant's drafts.
 */
it('does not gate applicant pages behind an agency permission', function (string $path, string $name): void {
    $route = Route::getRoutes()->getByName($name);

    expect($route)->not->toBeNull();
    expect(collect($route?->gatherMiddleware())->implode(' '))
        ->not->toContain('can:');
})->with([
    ['/jobs', 'jobs.index'],
    ['/job/land-1', 'jobs.show'],
    ['/job/land-1/apply', 'jobs.apply'],
    ['/resume', 'resume'],
    ['/applications', 'applications'],
    ['/contact', 'contact'],
]);
