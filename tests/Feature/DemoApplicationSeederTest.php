<?php

use App\Enums\ApplicationStage;
use Database\Seeders\DemoAgencySeeder;
use Illuminate\Support\Facades\DB;

test('the demo seeder fills every stage for every agency without exceeding hired slots', function () {
    app()->detectEnvironment(fn () => 'local');

    $this->seed();

    $stages = collect(ApplicationStage::cases())->map(fn (ApplicationStage $stage): string => $stage->value)->sort()->values()->all();
    $pairs = DB::table('applications')
        ->join('job_posts', 'job_posts.id', '=', 'applications.job_post_id')
        ->join('agencies', 'agencies.id', '=', 'job_posts.agency_id')
        ->select('agencies.slug', 'applications.stage')->distinct()->get();

    expect($pairs->pluck('slug')->unique()->sort()->values()->all())->toBe(collect(DemoAgencySeeder::SLUGS)->sort()->values()->all());

    foreach (DemoAgencySeeder::SLUGS as $slug) {
        expect($pairs->where('slug', $slug)->pluck('stage')->sort()->values()->all())->toBe($stages);
    }

    expect(DB::table('applications')
        ->join('job_posts', 'job_posts.id', '=', 'applications.job_post_id')
        ->where('applications.stage', ApplicationStage::Hired->value)
        ->select('applications.job_post_id')
        ->groupBy('applications.job_post_id', 'job_posts.vacant_positions')
        ->havingRaw('count(*) > job_posts.vacant_positions')
        ->get())->toBeEmpty();
});
