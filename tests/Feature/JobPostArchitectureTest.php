<?php

arch('job controllers use actions instead of persistence or services')
    ->expect('App\Http\Controllers\Dashboard')
    ->not->toUse(['App\Repositories', 'App\Services', 'App\Models', 'Illuminate\Support\Facades\DB']);

arch('job and employer actions have no persistence or HTTP dependencies')
    ->expect(['App\Actions\JobPost', 'App\Actions\Employer', 'App\Actions\Application'])
    ->not->toUse(['App\Repositories', 'Illuminate\Http', 'Inertia']);

arch('domain services have no HTTP or query dependencies')
    ->expect(['App\Services\JobPost', 'App\Services\Employer', 'App\Services\AgencyService', 'App\Services\Application'])
    ->not->toUse(['Illuminate\Http', 'Inertia', 'Illuminate\Support\Facades\DB', 'Illuminate\Database\Eloquent\Builder', 'Illuminate\Database\Query\Builder']);

arch('repositories do not depend on actions services or HTTP')
    ->expect('App\Repositories')
    ->not->toUse(['Illuminate\Http', 'Inertia', 'App\Services', 'App\Actions']);
