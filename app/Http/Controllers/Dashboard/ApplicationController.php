<?php

namespace App\Http\Controllers\Dashboard;

use App\Actions\Application\ListApplicationsAction;
use App\Actions\Application\ProceedApplicationAction;
use App\Actions\Application\RejectApplicationAction;
use App\Actions\Application\ReviewApplicationAction;
use App\Actions\Application\ShowApplicationAction;
use App\Actions\Application\ShowApplicationDocumentAction;
use App\Enums\Permission;
use App\Exceptions\Application\IllegalApplicationTransitionException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Dashboard\ApplicationIndexRequest;
use App\Http\Requests\Dashboard\RejectApplicationRequest;
use App\Http\Resources\ApplicationDetailResource;
use App\Http\Resources\ApplicationRowResource;
use App\Support\Toast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
            'canManageApplications' => $user->can(Permission::ManageApplications->value),
        ]);
    }

    public function show(Request $request, int $application, ShowApplicationAction $action): Response
    {
        return Inertia::render('dashboard/applications/show', [
            'application' => (new ApplicationDetailResource($action->execute($request->user(), $application)))->resolve($request),
        ]);
    }

    public function proceed(Request $request, int $application, ProceedApplicationAction $action): RedirectResponse|JsonResponse
    {
        try {
            $stage = $action->execute($request->user(), $application, $request->ip() ?? '0.0.0.0');
        } catch (IllegalApplicationTransitionException $exception) {
            return $this->transitionFailed($request, $exception);
        }

        Toast::success(__('Application moved to :stage.', ['stage' => $stage->label()]));

        return back();
    }

    /** Fired when an eligible viewer opens a pending application; silent either way. */
    public function review(Request $request, int $application, ReviewApplicationAction $action): RedirectResponse
    {
        $action->execute($request->user(), $application, $request->ip() ?? '0.0.0.0');

        return back();
    }

    public function reject(RejectApplicationRequest $request, int $application, RejectApplicationAction $action): RedirectResponse|JsonResponse
    {
        try {
            $action->execute($request->user(), $application, $request->ip() ?? '0.0.0.0', $request->validated('note'));
        } catch (IllegalApplicationTransitionException $exception) {
            return $this->transitionFailed($request, $exception);
        }

        Toast::success(__('Application marked as not selected.'));

        return back();
    }

    public function document(Request $request, int $application, int $document, ShowApplicationDocumentAction $action): StreamedResponse
    {
        $file = $action->execute($request->user(), $application, $document);
        abort_unless(Storage::disk('local')->exists($file->storage_path), 404);

        return Storage::disk('local')->download($file->storage_path, $file->original_file_name);
    }

    private function transitionFailed(Request $request, IllegalApplicationTransitionException $exception): RedirectResponse|JsonResponse
    {
        if ($request->expectsJson()) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        Toast::error($exception->getMessage());

        return back();
    }
}
