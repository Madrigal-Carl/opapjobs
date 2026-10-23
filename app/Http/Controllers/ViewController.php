<?php

namespace App\Http\Controllers;

use App\Support\DashboardOverview;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ViewController extends Controller
{
    public function home(): Response
    {
        return Inertia::render('home');
    }

    public function agencies(): Response
    {
        return Inertia::render('agencies/index');
    }

    public function agency(string $slug): Response
    {
        return Inertia::render('agencies/show', [
            'slug' => $slug,
        ]);
    }

    public function jobs(): Response
    {
        return Inertia::render('jobs/index');
    }

    public function job(string $job): Response
    {
        return Inertia::render('jobs/show', [
            'jobId' => $job,
        ]);
    }

    public function jobApply(string $job): Response
    {
        return Inertia::render('jobs/apply', [
            'jobId' => $job,
        ]);
    }

    public function resume(): Response
    {
        return Inertia::render('applicant/resume');
    }

    public function applications(): Response
    {
        return Inertia::render('applicant/applications');
    }

    public function contact(): Response
    {
        return Inertia::render('contact');
    }

    public function dashboardOverview(Request $request): Response
    {
        $component = DashboardOverview::componentFor($request->user());

        if ($component === null) {
            abort(403);
        }

        return Inertia::render($component);
    }

    public function dashboardApplication(string $application): Response
    {
        return Inertia::render('dashboard/applications/show', [
            'applicationId' => $application,
        ]);
    }

    public function dashboardCandidates(): Response
    {
        return Inertia::render('dashboard/candidates');
    }

    public function dashboardAccounts(): Response
    {
        return Inertia::render('dashboard/accounts');
    }

    /**
     * Super Admin console. Each screen reads and writes mock data held in
     * the browser, so these methods only pick the component and pass the
     * route id through — there is no query, service or policy behind them.
     */
    public function systemOverview(): Response
    {
        return Inertia::render('dashboard/system/overview');
    }

    public function systemAgencies(): Response
    {
        return Inertia::render('dashboard/system/agencies/index');
    }

    public function systemAgenciesCreate(): Response
    {
        return Inertia::render('dashboard/system/agencies/create');
    }

    public function systemAgenciesShow(string $agency): Response
    {
        return Inertia::render('dashboard/system/agencies/show', [
            'agencyId' => $agency,
        ]);
    }

    public function systemAccounts(): Response
    {
        return Inertia::render('dashboard/system/accounts');
    }

    public function systemJobPosts(): Response
    {
        return Inertia::render('dashboard/system/job-posts/index');
    }

    public function systemJobPostsCreate(): Response
    {
        return Inertia::render('dashboard/system/job-posts/create');
    }

    public function systemJobPostsShow(string $jobPost): Response
    {
        return Inertia::render('dashboard/system/job-posts/show', [
            'jobPostId' => $jobPost,
        ]);
    }

    public function systemApplications(): Response
    {
        return Inertia::render('dashboard/system/applications');
    }

    public function systemApplicants(): Response
    {
        return Inertia::render('dashboard/system/applicants/index');
    }

    public function systemApplicantsShow(string $applicant): Response
    {
        return Inertia::render('dashboard/system/applicants/show', [
            'applicantId' => $applicant,
        ]);
    }

    public function systemReviews(): Response
    {
        return Inertia::render('dashboard/system/reviews');
    }

    public function systemCategories(): Response
    {
        return Inertia::render('dashboard/system/categories');
    }

    public function systemFields(): Response
    {
        return Inertia::render('dashboard/system/fields');
    }

    public function systemContent(): Response
    {
        return Inertia::render('dashboard/system/content');
    }

    public function systemAuditLog(): Response
    {
        return Inertia::render('dashboard/system/audit-log');
    }

    public function systemSettings(): Response
    {
        return Inertia::render('dashboard/system/settings');
    }
}
