<?php

namespace App\Http\Controllers;

use App\Actions\Site\ListPublicAgenciesAction;
use App\Actions\Site\ListPublicJobPostsAction;
use App\Actions\Site\ShowApplicantResumeAction;
use App\Actions\Site\ShowHomeAction;
use App\Actions\Site\ShowJobApplicationAction;
use App\Actions\Site\ShowMyJobsAction;
use App\Actions\Site\ShowPublicAgencyAction;
use App\Actions\Site\ShowPublicJobPostAction;
use App\Http\Requests\Site\PublicAgencyIndexRequest;
use App\Http\Requests\Site\PublicAgencyShowRequest;
use App\Http\Requests\Site\PublicJobPostIndexRequest;
use App\Http\Resources\Site\ApplicantJobPostResource;
use App\Http\Resources\Site\ApplicantResumeResource;
use App\Http\Resources\Site\PublicAgencyCardResource;
use App\Http\Resources\Site\PublicAgencyListedByResource;
use App\Http\Resources\Site\PublicAgencyProfileResource;
use App\Http\Resources\Site\PublicAgencyReviewResource;
use App\Http\Resources\Site\PublicJobPostCardResource;
use App\Http\Resources\Site\PublicJobPostDetailResource;
use App\Http\Resources\Site\PublicJobPostPreviewResource;
use App\Http\Resources\Site\PublicJobPostQuestionResource;
use App\Support\DashboardOverview;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ViewController extends Controller
{
    public function home(Request $request, ShowHomeAction $action): Response
    {
        $home = $action->execute();
        $byPathway = fn (array $groups, string $resource): array => array_map(
            fn (iterable $items): array => $resource::collection($items)->resolve($request), $groups,
        );

        return Inertia::render('home', [
            'agencies' => $byPathway($home['agencies'], PublicAgencyCardResource::class),
            'topHirers' => $byPathway($home['topHirers'], PublicAgencyCardResource::class),
            'jobs' => $byPathway($home['jobs'], PublicJobPostCardResource::class),
            'stats' => $home['stats'],
        ]);
    }

    public function agencies(PublicAgencyIndexRequest $request, ListPublicAgenciesAction $action): Response
    {
        $filters = $request->filters();
        $result = $action->execute($filters);
        $page = $result['agencies'];

        return Inertia::render('agencies/index', [
            'agencies' => [
                'items' => PublicAgencyCardResource::collection($page->getCollection())->resolve($request),
                'total' => $page->total(), 'totalPages' => $page->lastPage(), 'page' => $page->currentPage(),
            ],
            'pathwayCounts' => $result['counts'],
            'filters' => [...$filters->toArray(), 'page' => $page->currentPage()],
        ]);
    }

    public function agency(PublicAgencyShowRequest $request, string $slug, ShowPublicAgencyAction $action): Response
    {
        $profile = $action->execute($slug, $request->reviewsPage());

        if ($profile === null) {
            return Inertia::render('agencies/show', ['agency' => null]);
        }

        $reviews = $profile['reviews'];

        return Inertia::render('agencies/show', [
            'agency' => PublicAgencyProfileResource::make($profile['agency'])->resolve($request),
            'jobs' => PublicJobPostCardResource::collection($profile['jobs'])->resolve($request),
            'ratingSummary' => $profile['ratingSummary'],
            'reviews' => [
                'data' => PublicAgencyReviewResource::collection($reviews->getCollection())->resolve($request),
                'page' => $reviews->currentPage(), 'totalPages' => $reviews->lastPage(), 'total' => $reviews->total(),
            ],
        ]);
    }

    public function jobs(PublicJobPostIndexRequest $request, ListPublicJobPostsAction $action): Response
    {
        $filters = $request->filters();
        $result = $action->execute($filters);
        $page = $result['posts'];

        return Inertia::render('jobs/index', [
            // Appended on "load more" partial reloads, matched on id so a batch can never repeat a job post;
            // the client resets it when the search changes.
            'jobPosts' => Inertia::merge(PublicJobPostPreviewResource::collection($page->getCollection())->resolve($request))->matchOn('id'),
            'jobPostsMeta' => [
                'page' => $page->currentPage(), 'hasMore' => $page->hasMorePages(),
                'nextPage' => $page->hasMorePages() ? $page->currentPage() + 1 : null, 'total' => $page->total(),
            ],
            'filters' => $filters->toArray(),
        ]);
    }

    public function job(Request $request, string $job, ShowPublicJobPostAction $action): Response
    {
        $result = $action->execute($job, $request->user());

        if ($result === null) {
            return Inertia::render('jobs/show', ['jobPost' => null]);
        }

        return Inertia::render('jobs/show', [
            'jobPost' => PublicJobPostDetailResource::make($result['post'])->resolve($request),
            'agency' => PublicAgencyListedByResource::make($result['agency'])->resolve($request),
            'otherJobsFromAgency' => PublicJobPostCardResource::collection($result['otherJobs'])->resolve($request),
            'relatedJobs' => PublicJobPostCardResource::collection($result['relatedJobs'])->resolve($request),
        ]);
    }

    public function jobApply(Request $request, string $job, ShowJobApplicationAction $action): Response
    {
        $result = $action->execute($job, $request->user());

        if ($result === null) {
            return Inertia::render('jobs/apply', ['jobId' => $job, 'jobPost' => null]);
        }

        return Inertia::render('jobs/apply', [
            'jobId' => $job,
            'jobPost' => PublicJobPostDetailResource::make($result['post'])->resolve($request),
            'questions' => PublicJobPostQuestionResource::collection($result['questions'])->resolve($request),
            'resume' => $result['applicant'] === null ? null : ApplicantResumeResource::make($result['applicant'])->resolve($request),
        ]);
    }

    public function resume(Request $request, ShowApplicantResumeAction $action): Response
    {
        $applicant = $action->execute($request->user());

        return Inertia::render('applicant/resume', [
            'resume' => $applicant === null ? null : ApplicantResumeResource::make($applicant)->resolve($request),
        ]);
    }

    public function applications(Request $request, ShowMyJobsAction $action): Response
    {
        $myJobs = $action->execute($request->user());

        return Inertia::render('applicant/applications', [
            'applied' => ApplicantJobPostResource::collection($myJobs['applied'])->resolve($request),
            'saved' => ApplicantJobPostResource::collection($myJobs['saved'])->resolve($request),
            'archived' => ApplicantJobPostResource::collection($myJobs['archived'])->resolve($request),
        ]);
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

    public function dashboardCandidates(): Response
    {
        return Inertia::render('dashboard/candidates');
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
