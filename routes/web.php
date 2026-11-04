<?php

use App\Enums\Permission;
use App\Http\Controllers\Dashboard\AccountController;
use App\Http\Controllers\Dashboard\ApplicationController;
use App\Http\Controllers\Dashboard\EmployerController;
use App\Http\Controllers\Dashboard\JobPostController;
use App\Http\Controllers\Dashboard\OverviewController;
use App\Http\Controllers\RedirectController;
use App\Http\Controllers\ViewController;
use Illuminate\Support\Facades\Route;

Route::middleware('redirect.staff')->group(function () {
    Route::get('/', [ViewController::class, 'home'])->name('home');
    Route::get('agencies', [ViewController::class, 'agencies'])->name('agencies.index');
    Route::get('jobs', [ViewController::class, 'jobs'])->name('jobs.index');
    Route::get('contact', [ViewController::class, 'contact'])->name('contact');
});

Route::get('agency/{slug}', [ViewController::class, 'agency'])
    ->where('slug', '[a-z0-9-]+')
    ->middleware(['redirect.staff', 'auth', 'verified', 'can:'.Permission::ViewAgencyProfile->value])
    ->name('agencies.show');

Route::get('job/{job}', [ViewController::class, 'job'])
    ->where('job', '[a-z0-9-]+')
    ->middleware('redirect.staff')
    ->name('jobs.show');

/**
 * Applicant-only pages. `redirect.staff` sends the agency side back to the
 * overview; `auth` sends guests to sign in and back again afterwards.
 */
Route::middleware(['auth', 'verified', 'redirect.staff'])->group(function () {
    Route::get('job/{job}/apply', [ViewController::class, 'jobApply'])
        ->where('job', '[a-z0-9-]+')
        ->name('jobs.apply');

    Route::get('resume', [ViewController::class, 'resume'])->name('resume');

    Route::get('applications', [ViewController::class, 'applications'])->name('applications');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [RedirectController::class, 'dashboard'])->name('dashboard');

    Route::middleware('dashboard.access')
        ->prefix('dashboard')
        ->group(function () {
            Route::get('overview', [OverviewController::class, 'index'])->name('dashboard.overview');

            Route::get('jobs/new', [JobPostController::class, 'create'])
                ->middleware('can:'.Permission::ManageJob->value)
                ->name('dashboard.jobs.create');

            Route::post('jobs', [JobPostController::class, 'store'])
                ->middleware('can:'.Permission::ManageJob->value)
                ->name('dashboard.jobs.store');

            Route::get('jobs/duplicates', [JobPostController::class, 'duplicates'])
                ->middleware('can:'.Permission::ManageJob->value)
                ->name('dashboard.jobs.duplicates');

            Route::middleware('can:'.Permission::ManageJob->value)->group(function () {
                Route::get('jobs/{jobPost}/edit', [JobPostController::class, 'edit'])->whereNumber('jobPost')->name('dashboard.jobs.edit');
                Route::put('jobs/{jobPost}', [JobPostController::class, 'update'])->whereNumber('jobPost')->name('dashboard.jobs.update');
                Route::patch('jobs/{jobPost}/status', [JobPostController::class, 'status'])->whereNumber('jobPost')->name('dashboard.jobs.status');
                Route::patch('jobs/{jobPost}/archive', [JobPostController::class, 'archive'])->whereNumber('jobPost')->name('dashboard.jobs.archive');
            });

            Route::post('employers', [EmployerController::class, 'store'])
                ->middleware('can:'.Permission::ManageJob->value)
                ->name('dashboard.employers.store');

            Route::get('jobs', [JobPostController::class, 'index'])
                ->middleware('can:'.Permission::ViewJobs->value)
                ->name('dashboard.jobs');

            Route::get('applications/{application}', [ApplicationController::class, 'show'])
                ->whereNumber('application')
                ->middleware('can:'.Permission::ViewApplications->value)
                ->name('dashboard.applications.show');

            Route::get('applications/{application}/documents/{document}', [ApplicationController::class, 'document'])
                ->whereNumber('application')->whereNumber('document')
                ->middleware('can:'.Permission::ViewApplications->value)
                ->name('dashboard.applications.documents');

            Route::middleware('can:'.Permission::ManageApplications->value)->group(function () {
                Route::patch('applications/{application}/proceed', [ApplicationController::class, 'proceed'])
                    ->whereNumber('application')->name('dashboard.applications.proceed');

                Route::patch('applications/{application}/reject', [ApplicationController::class, 'reject'])
                    ->whereNumber('application')->name('dashboard.applications.reject');
            });

            Route::get('applications', [ApplicationController::class, 'index'])
                ->middleware('can:'.Permission::ViewApplications->value)
                ->name('dashboard.applications');

            Route::get('candidates', [ViewController::class, 'dashboardCandidates'])
                ->middleware('can:'.Permission::ViewCandidates->value)
                ->name('dashboard.candidates');

            Route::get('accounts', [AccountController::class, 'index'])
                ->middleware('can:'.Permission::ViewAccounts->value)
                ->name('dashboard.accounts');

            Route::post('accounts', [AccountController::class, 'store'])
                ->middleware('can:'.Permission::ManageAccounts->value)
                ->name('dashboard.accounts.store');

            Route::put('accounts/{account}', [AccountController::class, 'update'])
                ->whereNumber('account')
                ->middleware('can:'.Permission::ManageAccounts->value)
                ->name('dashboard.accounts.update');

            Route::patch('accounts/{account}/status', [AccountController::class, 'status'])
                ->whereNumber('account')
                ->middleware('can:'.Permission::ManageAccounts->value)
                ->name('dashboard.accounts.status');

            Route::patch('accounts/{account}/archive', [AccountController::class, 'archive'])
                ->whereNumber('account')
                ->middleware('can:'.Permission::ManageAccounts->value)
                ->name('dashboard.accounts.archive');

            /**
             * Super Admin console. Every screen is gated on the one
             * superadmin-only capability (docs §2.3); the pages themselves
             * run on mock data in the browser and write nothing.
             */
            Route::prefix('system')
                ->middleware('can:'.Permission::ViewSystemOverview->value)
                ->group(function () {
                    Route::get('agencies/new', [ViewController::class, 'systemAgenciesCreate'])->name('dashboard.system.agencies.create');
                    Route::get('agencies/{agency}', [ViewController::class, 'systemAgenciesShow'])->name('dashboard.system.agencies.show');
                    Route::get('agencies', [ViewController::class, 'systemAgencies'])->name('dashboard.system.agencies');

                    Route::get('accounts', [ViewController::class, 'systemAccounts'])->name('dashboard.system.accounts');

                    Route::get('job-posts/new', [ViewController::class, 'systemJobPostsCreate'])->name('dashboard.system.job-posts.create');
                    Route::get('job-posts/{jobPost}', [ViewController::class, 'systemJobPostsShow'])->name('dashboard.system.job-posts.show');
                    Route::get('job-posts', [ViewController::class, 'systemJobPosts'])->name('dashboard.system.job-posts');

                    Route::get('applications', [ViewController::class, 'systemApplications'])->name('dashboard.system.applications');

                    Route::get('applicants/{applicant}', [ViewController::class, 'systemApplicantsShow'])->name('dashboard.system.applicants.show');
                    Route::get('applicants', [ViewController::class, 'systemApplicants'])->name('dashboard.system.applicants');

                    Route::get('reviews', [ViewController::class, 'systemReviews'])->name('dashboard.system.reviews');

                    Route::get('categories', [ViewController::class, 'systemCategories'])->name('dashboard.system.categories');

                    Route::get('fields', [ViewController::class, 'systemFields'])->name('dashboard.system.fields');

                    Route::get('content', [ViewController::class, 'systemContent'])->name('dashboard.system.content');

                    Route::get('audit-log', [ViewController::class, 'systemAuditLog'])->name('dashboard.system.audit-log');
                });
        });
});

require __DIR__.'/settings.php';
