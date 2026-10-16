<?php

use App\Enums\Permission;
use App\Http\Controllers\RedirectController;
use App\Http\Controllers\ViewController;
use Illuminate\Support\Facades\Route;

Route::middleware('redirect.staff')->group(function () {
    Route::get('/', [ViewController::class, 'home'])->name('home');
    Route::get('agencies', [ViewController::class, 'agencies'])->name('agencies.index');
    Route::get('jobs', [ViewController::class, 'jobs'])->name('jobs.index');
    Route::get('contact', [ViewController::class, 'contact'])->name('contact');
});

Route::get('job/{job}', [ViewController::class, 'job'])
    ->where('job', '[a-z0-9-]+')
    ->middleware('redirect.staff')
    ->name('jobs.show');

/**
 * Applicant-only pages. A signed-in verified user lands here; staff are sent
 * back to the overview by `redirect.staff`, and guests by `auth`.
 */
Route::middleware(['auth', 'verified', 'redirect.staff'])->group(function () {
    Route::get('job/{job}/apply', [ViewController::class, 'jobApply'])
        ->where('job', '[a-z0-9-]+')
        ->name('jobs.apply');

    Route::get('resume', [ViewController::class, 'resume'])->name('resume');

    Route::get('applications', [ViewController::class, 'applications'])->name('applications');
});

Route::get('agency/{slug}', [ViewController::class, 'agency'])
    ->where('slug', '[a-z0-9-]+')
    ->middleware(['redirect.staff', 'auth', 'verified', 'can:'.Permission::ViewAgencyProfile->value])
    ->name('agencies.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [RedirectController::class, 'dashboard'])->name('dashboard');

    Route::middleware('dashboard.access')
        ->prefix('dashboard')
        ->group(function () {
            Route::get('overview', [ViewController::class, 'dashboardOverview'])->name('dashboard.overview');

            Route::get('jobs/new', [ViewController::class, 'dashboardNewJob'])
                ->middleware('can:'.Permission::ViewJobs->value)
                ->name('dashboard.jobs.create');

            Route::get('jobs', [ViewController::class, 'dashboardJobs'])
                ->middleware('can:'.Permission::ViewJobs->value)
                ->name('dashboard.jobs');

            Route::get('applications/{application}', [ViewController::class, 'dashboardApplication'])
                ->middleware('can:'.Permission::ViewApplications->value)
                ->name('dashboard.applications.show');

            Route::get('applications', [ViewController::class, 'dashboardApplications'])
                ->middleware('can:'.Permission::ViewApplications->value)
                ->name('dashboard.applications');

            Route::get('candidates', [ViewController::class, 'dashboardCandidates'])
                ->middleware('can:'.Permission::ViewCandidates->value)
                ->name('dashboard.candidates');

            Route::get('accounts', [ViewController::class, 'dashboardAccounts'])
                ->middleware('can:'.Permission::ViewAccounts->value)
                ->name('dashboard.accounts');
        });
});

require __DIR__.'/settings.php';
