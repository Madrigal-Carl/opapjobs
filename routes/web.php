<?php

use App\Enums\Permission;
use App\Http\Controllers\RedirectController;
use App\Http\Controllers\ViewController;
use Illuminate\Support\Facades\Route;

Route::middleware('redirect.staff')->group(function () {
    Route::get('/', [ViewController::class, 'home'])->name('home');
    Route::get('agencies', [ViewController::class, 'agencies'])->name('agencies.index');
});

Route::get('agency/{slug}', [ViewController::class, 'agency'])
    ->where('slug', '[a-z0-9-]+')
    ->middleware(['redirect.staff', 'auth', 'verified', 'can:'.Permission::ViewAgencyProfile->value])
    ->name('agencies.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [RedirectController::class, 'dashboard'])->name('dashboard');

    Route::middleware('dashboard.access')
        ->prefix('dashboard')
        ->group(function () {
            Route::get('overview', [ViewController::class, 'dashboardOverview'])->name('dashboard.overview');
        });
});

require __DIR__.'/settings.php';
