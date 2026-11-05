<?php

namespace App\Http\Controllers\Dashboard;

use App\Actions\Overview\BuildPlatformOverviewAction;
use App\Http\Controllers\Controller;
use App\Support\DashboardOverview;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OverviewController extends Controller
{
    public function __construct(private BuildPlatformOverviewAction $overview) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        if ($user === null) {
            abort(403);
        }

        $component = DashboardOverview::componentFor($user);

        if ($component === null) {
            abort(403);
        }

        // Only the platform overview reads the database. The hiring and
        // system overviews deliberately keep their reference data so no
        // other role's screen changes.
        $props = $component === 'dashboard/overview/platform'
            ? ['platformOverview' => $this->overview->execute($user)]
            : [];

        return Inertia::render($component, $props);
    }
}
