<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class ViewController extends Controller
{
    public function home(): Response
    {
        return Inertia::render('home');
    }

    public function agencies(): Response
    {
        return Inertia::render('agencies/index');
    }

    public function agency(string $slug): Response
    {
        return Inertia::render('agencies/show', [
            'slug' => $slug,
        ]);
    }

    public function dashboardOverview(): Response
    {
        return Inertia::render('dashboard/overview');
    }

    public function settingsAppearance(): Response
    {
        return Inertia::render('settings/appearance');
    }
}
