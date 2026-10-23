<?php

namespace App\Http\Controllers\Dashboard;

use App\Actions\Application\ListApplicationsAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Dashboard\ApplicationIndexRequest;
use App\Http\Resources\ApplicationRowResource;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationController extends Controller
{
    public function __construct(private ListApplicationsAction $list) {}

    public function index(ApplicationIndexRequest $request): Response
    {
        $filters = $request->filters();
        $user = $request->user();

        return Inertia::render('dashboard/applications', [
            'applications' => function () use ($user, $filters, $request): array {
                $results = $this->list->execute($user, $filters)['applications'];
                assert($results !== null);

                return [
                    'data' => ApplicationRowResource::collection($results->getCollection())->resolve($request),
                    'meta' => [
                        'current_page' => $results->currentPage(), 'last_page' => $results->lastPage(),
                        'per_page' => $results->perPage(), 'total' => $results->total(),
                        'from' => $results->firstItem(), 'to' => $results->lastItem(),
                    ],
                ];
            },
            'filters' => $filters->toArray(),
            'kpis' => Inertia::defer(fn (): ?array => $this->list->execute($user, $filters, includeApplications: false, includeKpis: true)['kpis']),
        ]);
    }
}
