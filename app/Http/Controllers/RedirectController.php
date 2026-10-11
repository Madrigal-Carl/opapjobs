<?php

namespace App\Http\Controllers;

use App\Support\RoleHome;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class RedirectController extends Controller
{
    public function dashboard(Request $request): RedirectResponse
    {
        return redirect()->to(RoleHome::pathFor($request->user()));
    }

    public function settings(): RedirectResponse
    {
        return redirect()->route('profile.edit');
    }
}
