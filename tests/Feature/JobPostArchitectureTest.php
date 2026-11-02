<?php

arch('job controllers use actions instead of persistence or services')
    ->expect('App\Http\Controllers\Dashboard')
    ->not->toUse(['App\Repositories', 'App\Services', 'App\Models', 'Illuminate\Support\Facades\DB']);

arch('job and employer actions have no persistence or HTTP dependencies')
    ->expect(['App\Actions\JobPost', 'App\Actions\Employer', 'App\Actions\Application', 'App\Actions\Account'])
    ->not->toUse(['App\Repositories', 'Illuminate\Http', 'Inertia']);

arch('domain services have no HTTP or query dependencies')
    ->expect(['App\Services\JobPost', 'App\Services\Employer', 'App\Services\AgencyService', 'App\Services\Application', 'App\Services\Account'])
    ->not->toUse(['Illuminate\Http', 'Inertia', 'Illuminate\Support\Facades\DB', 'Illuminate\Database\Eloquent\Builder', 'Illuminate\Database\Query\Builder']);

arch('repositories do not depend on actions services or HTTP')
    ->expect('App\Repositories')
    ->not->toUse(['Illuminate\Http', 'Inertia', 'App\Services', 'App\Actions']);

arch('public site actions have no persistence or HTTP dependencies')
    ->expect('App\Actions\Site')
    ->not->toUse(['App\Repositories', 'Illuminate\Http', 'Inertia']);

arch('public site services have no HTTP or query dependencies')
    ->expect('App\Services\Site')
    ->not->toUse(['Illuminate\Http', 'Inertia', 'Illuminate\Support\Facades\DB', 'Illuminate\Database\Eloquent\Builder', 'Illuminate\Database\Query\Builder', 'App\Actions']);

arch('public site repositories do not depend on actions services or HTTP')
    ->expect('App\Repositories\Site')
    ->not->toUse(['Illuminate\Http', 'Inertia', 'App\Services', 'App\Actions']);

arch('the public page controller reads through actions only')
    ->expect('App\Http\Controllers\ViewController')
    ->not->toUse(['App\Repositories', 'App\Services', 'App\Models', 'Illuminate\Support\Facades\DB']);

arch('public site resources and requests stay out of persistence')
    ->expect(['App\Http\Resources\Site', 'App\Http\Requests\Site'])
    ->not->toUse(['App\Repositories', 'App\Services', 'App\Actions', 'Illuminate\Support\Facades\DB']);
