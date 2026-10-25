<?php

namespace App\Http\Controllers\Dashboard;

use App\Actions\Account\ChangeAccountStatusAction;
use App\Actions\Account\ListAccountsAction;
use App\Actions\Account\StoreAccountAction;
use App\Actions\Account\UpdateAccountAction;
use App\Enums\DataScope;
use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Dashboard\AccountIndexRequest;
use App\Http\Requests\Dashboard\StoreAccountRequest;
use App\Http\Requests\Dashboard\UpdateAccountRequest;
use App\Http\Resources\AccountRowResource;
use App\Support\DataScopeResolver;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function __construct(private ListAccountsAction $list) {}

    public function index(AccountIndexRequest $request): Response
    {
        $user = $request->user();
        $filters = $request->filters();
        $canManageAccounts = $user->can(Permission::ManageAccounts->value);

        if (DataScopeResolver::for($user) !== DataScope::Agency) {
            return Inertia::render('dashboard/accounts', [
                'staff' => [
                    'data' => [],
                    'meta' => [
                        'current_page' => 1, 'last_page' => 1, 'per_page' => $filters->perPage,
                        'total' => 0, 'from' => null, 'to' => null,
                    ],
                ],
                'filters' => $filters->toArray(),
                'kpis' => Inertia::defer(fn (): array => ['total_staff' => 0, 'active' => 0, 'suspended' => 0, 'jobs_created' => 0]),
                'seats' => ['used' => 0, 'limit' => 0],
                'canManageAccounts' => false,
            ]);
        }

        $results = $this->list->execute($user, $filters, includeStaff: true, includeSeats: true);
        $staff = $results['staff'];
        assert($staff !== null);

        return Inertia::render('dashboard/accounts', [
            'staff' => [
                'data' => AccountRowResource::collection($staff->getCollection())->resolve($request),
                'meta' => [
                    'current_page' => $staff->currentPage(), 'last_page' => $staff->lastPage(),
                    'per_page' => $staff->perPage(), 'total' => $staff->total(),
                    'from' => $staff->firstItem(), 'to' => $staff->lastItem(),
                ],
            ],
            'filters' => $filters->toArray(),
            'kpis' => Inertia::defer(fn (): ?array => $this->list->execute($user, $filters, includeStaff: false, includeKpis: true, includeSeats: false)['kpis']),
            'seats' => $results['seats'],
            'canManageAccounts' => $canManageAccounts,
        ]);
    }

    public function store(StoreAccountRequest $request, StoreAccountAction $action): RedirectResponse
    {
        $action->execute($request->user(), $request->toDto());
        Toast::success(__('Staff account added.'));

        return back();
    }

    public function update(UpdateAccountRequest $request, int $account, UpdateAccountAction $action): RedirectResponse
    {
        $action->execute($request->user(), $account, $request->toDto());
        Toast::success(__('Staff account updated.'));

        return back();
    }

    public function status(Request $request, int $account, ChangeAccountStatusAction $action): RedirectResponse
    {
        $validated = $request->validate(['status' => ['required', 'in:active,suspended']]);

        $action->execute($request->user(), $account, $validated['status'], $request->ip() ?? '0.0.0.0');
        Toast::success($validated['status'] === 'suspended'
            ? __('Staff account suspended.')
            : __('Staff account reactivated.'));

        return back();
    }
}
