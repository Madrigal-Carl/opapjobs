<?php

namespace App\Http\Controllers\Dashboard;

use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Dashboard\JobPostIndexRequest;
use App\Http\Resources\JobPostRowResource;
use App\Queries\JobPostIndexQuery;
use App\Queries\JobPostKpis;
use Inertia\Inertia;
use Inertia\Response;

class JobPostController extends Controller
{
    public function __construct(private JobPostIndexQuery $query, private JobPostKpis $kpis) {}

    public function index(JobPostIndexRequest $request): Response
    {
        $filters = $request->filters();
        $user = $request->user();

        return Inertia::render('dashboard/jobs', [
            'jobPosts' => function () use ($user, $filters, $request): array {
                $results = $this->query->paginate($user, $filters);

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
            'kpis' => Inertia::defer(fn (): array => $this->kpis->for($user)),
            'canManageJobs' => $user->can(Permission::ManageJob->value),
        ]);
    }
}
