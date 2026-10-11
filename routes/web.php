<?php

use App\Support\RoleHome;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('redirect.staff')->group(function () {
    Route::inertia('/', 'home')->name('home');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', fn (Request $request) => redirect()->to(RoleHome::pathFor($request->user())))
        ->name('dashboard');

    Route::middleware('dashboard.access')
        ->prefix('dashboard')
        ->group(function () {
            Route::inertia('overview', 'dashboard/overview')->name('dashboard.overview');
        });
});

require __DIR__.'/settings.php';
