<?php

use App\Enums\Pathway;
use App\Support\PublicAgencyRules;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\PublicCatalog;

test('the home page limits each pathway row and orders jobs newest first', function () {
    foreach (range(1, 5) as $index) {
        $agency = PublicCatalog::agency(Pathway::Landbased);
        PublicCatalog::posts($agency, 2);
    }
    $sea = PublicCatalog::agency(Pathway::Seabased);
    $newest = PublicCatalog::post($sea, ['job_title' => 'Newest Deck Cadet', 'created_at' => now()->subMinute()]);
    PublicCatalog::posts($sea, 7);

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('home')
            ->has('agencies.landbased', PublicAgencyRules::HOME_AGENCIES_PER_PATHWAY)
            ->has('agencies.seabased', 1)
            ->has('jobs.landbased', PublicAgencyRules::HOME_JOBS_PER_PATHWAY)
            ->has('jobs.seabased', PublicAgencyRules::HOME_JOBS_PER_PATHWAY)
            ->where('jobs.seabased.0.id', (string) $newest->id)
            ->where('jobs.seabased.0.pathway', 'seabased')
            ->where('stats.agencies', ['landbased' => 5, 'seabased' => 1])
            ->where('stats.jobs', ['landbased' => 10, 'seabased' => 8])
            ->where('stats.topHirers', ['landbased' => 0, 'seabased' => 0]));
});

test('the home page shows top hirers ranked by hired applicants', function () {
    $hires = ['Alpha' => 1, 'Bravo' => 9, 'Charlie' => 4, 'Delta' => 0];
    foreach ($hires as $name => $count) {
        $agency = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => "{$name} Manpower"]);
        PublicCatalog::hire(PublicCatalog::post($agency), $count);
    }

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('topHirers.landbased', 3)
            ->where('topHirers.landbased.0.name', 'Bravo Manpower')
            ->where('topHirers.landbased.0.hiredCount', 9)
            ->where('topHirers.landbased.0.topHirer', true)
            ->where('topHirers.landbased.1.name', 'Charlie Manpower')
            ->where('topHirers.landbased.2.name', 'Alpha Manpower')
            ->where('topHirers.seabased', [])
            ->where('stats.topHirers', ['landbased' => 3, 'seabased' => 0]));
});

test('the home page hides suspended and deleted agencies and job posts that are not active', function () {
    $public = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Open Agency']);
    PublicCatalog::post($public, ['job_title' => 'Visible Welder']);
    PublicCatalog::post($public, ['job_title' => 'Closed Welder', 'status' => 'closed']);
    PublicCatalog::post($public, ['job_title' => 'Archived Welder', 'status' => 'archived']);
    PublicCatalog::post($public, ['job_title' => 'Expired Welder', 'closing_date' => now()->subDay()->toDateString()]);

    $suspended = PublicCatalog::agency(Pathway::Landbased, ['suspended_at' => now()]);
    PublicCatalog::hire(PublicCatalog::post($suspended, ['job_title' => 'Suspended Welder']), 30);
    $deleted = PublicCatalog::agency(Pathway::Landbased);
    PublicCatalog::post($deleted, ['job_title' => 'Deleted Welder']);
    $deleted->delete();
    $unverified = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Unverified Agency', 'verified_at' => null]);

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('jobs.landbased', 1)
            ->where('jobs.landbased.0.title', 'Visible Welder')
            ->where('agencies.landbased', fn ($agencies) => collect($agencies)->pluck('name')->sort()->values()->all() === ['Open Agency', 'Unverified Agency'])
            ->where('agencies.landbased', fn ($agencies) => collect($agencies)->firstWhere('name', 'Unverified Agency')['verified'] === false)
            ->where('topHirers.landbased', [])
            ->where('stats.agencies.landbased', 2)
            ->where('stats.jobs.landbased', 1));

    expect($unverified->exists)->toBeTrue();
});
