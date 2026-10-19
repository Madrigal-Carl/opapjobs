<?php

namespace App\Http\Controllers\Dashboard;

use App\Actions\JobPost\FindDuplicateJobPostsAction;
use App\Actions\JobPost\ListJobPostsAction;
use App\Actions\JobPost\ShowCreateJobPostAction;
use App\Actions\JobPost\StoreJobPostAction;
use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Dashboard\CreateJobPostRequest;
use App\Http\Requests\Dashboard\JobPostDuplicateRequest;
use App\Http\Requests\Dashboard\JobPostIndexRequest;
use App\Http\Requests\Dashboard\StoreJobPostRequest;
use App\Http\Resources\JobPostRowResource;
use App\Support\Toast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class JobPostController extends Controller
{
    public function __construct(private ListJobPostsAction $list) {}

    public function create(CreateJobPostRequest $request, ShowCreateJobPostAction $action): Response
    {
        return Inertia::render('dashboard/jobs/new', $action->execute($request->user()));
    }

    public function store(StoreJobPostRequest $request, StoreJobPostAction $action): RedirectResponse
    {
        $action->execute($request->user(), $request->toDto());
        Toast::success(__('Job post published.'));

        return to_route($request->user()->can(Permission::ViewJobs->value) ? 'dashboard.jobs' : 'dashboard.jobs.create');
    }

    public function duplicates(JobPostDuplicateRequest $request, FindDuplicateJobPostsAction $action): JsonResponse
    {
        return response()->json(['duplicates' => $action->execute($request->user(), $request->toDto())]);
    }

    public function index(JobPostIndexRequest $request): Response
    {
        $filters = $request->filters();
        $user = $request->user();

        return Inertia::render('dashboard/jobs', [
            'jobPosts' => function () use ($user, $filters, $request): array {
                $results = $this->list->execute($user, $filters)['posts'];
                assert($results !== null);

                return [
                    'data' => JobPostRowResource::collection($results->getCollection())->resolve($request),
                    'meta' => [
                        'current_page' => $results->currentPage(), 'last_page' => $results->lastPage(),
                        'per_page' => $results->perPage(), 'total' => $results->total(),
                        'from' => $results->firstItem(), 'to' => $results->lastItem(),
                    ],
                ];
            },
            'filters' => $filters->toArray(),
            'kpis' => Inertia::defer(fn (): ?array => $this->list->execute($user, $filters, includePosts: false, includeKpis: true)['kpis']),
            'canManageJobs' => $user->can(Permission::ManageJob->value),
        ]);
    }
}
