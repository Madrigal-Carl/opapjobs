<?php

namespace App\Http\Controllers;

use App\Actions\Site\SetSavedJobPostAction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** The applicant's bookmarks, listed on the Saved tab of My Jobs. */
class SavedJobPostController extends Controller
{
    public function store(Request $request, int $job, SetSavedJobPostAction $action): RedirectResponse
    {
        $action->execute($request->user(), $job, saved: true);

        return back();
    }

    public function destroy(Request $request, int $job, SetSavedJobPostAction $action): RedirectResponse
    {
        $action->execute($request->user(), $job, saved: false);

        return back();
    }
}
