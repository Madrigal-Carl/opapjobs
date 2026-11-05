<?php

declare(strict_types=1);

use App\Models\User;

/**
 * The console and the applicant pages sit on opposite sides of the agency
 * dashboard. The `can:` middleware on the console group and the
 * `redirect.staff` middleware on the applicant pages are what separate
 * them; both are asserted here end to end, because a role that silently
 * gains a console URL (or lands on an applicant page) is the failure this
 * file exists to catch.
 *
 * Covered with the real routes rather than the permission names so a
 * newly added console screen cannot ship ungated.
 */

/** Every screen the superadmin console exposes. */
dataset('consoleUrls', [
    'agencies' => '/dashboard/system/agencies',
    'agency create' => '/dashboard/system/agencies/new',
    'accounts' => '/dashboard/system/accounts',
    'job posts' => '/dashboard/system/job-posts',
    'job post create' => '/dashboard/system/job-posts/new',
    'applications' => '/dashboard/system/applications',
    'applicants' => '/dashboard/system/applicants',
    'reviews' => '/dashboard/system/reviews',
    'categories' => '/dashboard/system/categories',
    'fields' => '/dashboard/system/fields',
    'content' => '/dashboard/system/content',
    'audit log' => '/dashboard/system/audit-log',
]);

/**
 * Neither staff role holds `view system overview`, so the console group
 * must refuse both of them on every URL it exposes.
 */
it('forbids staff from every console screen', function (string $role, string $url): void {
    $this->actingAs(User::factory()->{$role}()->create())
        ->get($url)
        ->assertForbidden();
})->with([
    'agency' => ['agency'],
    'admin' => ['admin'],
])->with('consoleUrls');

/** Staff have dashboard access, so the console must still render for them. */
it('lets a superadmin reach every console screen', function (string $url): void {
    $this->actingAs(User::factory()->superadmin()->create())
        ->get($url)
        ->assertOk();
})->with('consoleUrls');

/** Pages that only make sense to somebody applying for a job. */
dataset('applicantUrls', [
    'apply' => '/job/land-1/apply',
    'resume' => '/resume',
    'my jobs' => '/applications',
]);

/**
 * `redirect.staff` sends anyone with dashboard access back to their own
 * home, so the agency side cannot be driven from an applicant link.
 */
it('sends staff away from every applicant page', function (string $role, string $url): void {
    $this->actingAs(User::factory()->{$role}()->create())
        ->get($url)
        ->assertRedirect();
})->with([
    'agency' => ['agency'],
    'admin' => ['admin'],
])->with('applicantUrls');
