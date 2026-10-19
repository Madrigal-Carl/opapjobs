<?php

namespace App\Http\Controllers\Dashboard;

use App\Actions\Employer\StoreEmployerAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Dashboard\StoreEmployerRequest;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class EmployerController extends Controller
{
    public function store(StoreEmployerRequest $request, StoreEmployerAction $action): RedirectResponse
    {
        $employer = $action->execute($request->user(), $request->toDto());
        Toast::success(__('Employer added.'));
        Inertia::flash('createdEmployer', [
            'id' => $employer->id, 'name' => $employer->employer_name,
            'location' => $employer->employer_location, 'license_number' => $employer->employer_license_number,
        ]);

        return back();
    }
}
