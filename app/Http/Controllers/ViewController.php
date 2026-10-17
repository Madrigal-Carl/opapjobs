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

    public function dashboardJobs(): Response
    {
        return Inertia::render('dashboard/jobs');
    }

    public function dashboardNewJob(): Response
    {
        return Inertia::render('dashboard/jobs/new');
    }

    public function dashboardApplications(): Response
    {
        return Inertia::render('dashboard/applications');
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
}
