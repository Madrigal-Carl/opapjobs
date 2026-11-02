<?php

namespace App\Http\Middleware;

use App\Actions\Site\GetApplicantActivityAction;
use App\Enums\Permission;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
                'roles' => $request->user()?->getRoleNames() ?? [],
                'permissions' => $request->user()?->getAllPermissions()->pluck('name') ?? [],
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            // Job post ids per My Jobs tab, so every job card can show "applied" / "saved"
            // from the database. Only applicants get it; it is skipped on partial reloads.
            'applicantActivity' => fn (): ?array => $this->applicantActivity($request),
        ];
    }

    /** @return null|array{applied: list<string>, saved: list<string>, archived: list<string>} */
    private function applicantActivity(Request $request): ?array
    {
        $user = $request->user();

        // Applicants read agency profiles but never reach the dashboard; staff (and the
        // superadmin, who passes every check) are excluded by the second condition.
        if ($user === null || ! $user->can(Permission::ViewAgencyProfile->value) || $user->can(Permission::AccessDashboard->value)) {
            return null;
        }

        $ids = app(GetApplicantActivityAction::class)->execute($user);

        return array_map(fn (array $list): array => array_map('strval', $list), $ids);
    }
}
