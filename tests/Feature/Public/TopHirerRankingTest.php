<?php

use App\Enums\Pathway;
use App\Support\PublicAgencyRules;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\PublicCatalog;

test('top hirers count hires across job posts in any status', function () {
    $agency = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Closed Roles Agency']);
    PublicCatalog::hire(PublicCatalog::post($agency, ['status' => 'closed']), 2);
    PublicCatalog::hire(PublicCatalog::post($agency, ['status' => 'archived']), 1);
    PublicCatalog::hire(PublicCatalog::post($agency, ['closing_date' => now()->subWeek()->toDateString()]), 1);

    $this->get(route('agencies.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('agencies.items.0.name', 'Closed Roles Agency')
            ->where('agencies.items.0.hiredCount', 4)
            ->where('agencies.items.0.jobs', 0)
            ->where('agencies.items.0.topHirer', true));
});

test('only the first ranked agencies with at least one hire are flagged', function () {
    foreach (range(1, PublicAgencyRules::TOP_HIRER_RANK_LIMIT + 1) as $index) {
        $agency = PublicCatalog::agency(Pathway::Seabased, ['agency_name' => sprintf('Agency %02d', $index)]);
        PublicCatalog::hire(PublicCatalog::post($agency), 20 - $index);
    }
    PublicCatalog::agency(Pathway::Seabased, ['agency_name' => 'Agency 99']);

    $this->get(route('agencies.index', ['pathway' => 'seabased']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('agencies.items', fn ($items) => collect($items)->pluck('topHirer', 'name')->all() === [
                'Agency 01' => true, 'Agency 02' => true, 'Agency 03' => true, 'Agency 04' => true,
                'Agency 05' => true, 'Agency 06' => false, 'Agency 99' => false,
            ]));
});

test('an agency with no hires is never a top hirer even when ranked first', function () {
    PublicCatalog::posts(PublicCatalog::agency(Pathway::Landbased), 3);

    $this->get(route('agencies.index'))
        ->assertInertia(fn (Assert $page) => $page->where('agencies.items.0.topHirer', false));
});

test('ties on hires break by open jobs, then rating, then name', function () {
    $fewerJobs = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Aardvark Placement']);
    PublicCatalog::hire(PublicCatalog::post($fewerJobs), 3);

    $moreJobs = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Zulu Placement']);
    PublicCatalog::hire(PublicCatalog::post($moreJobs), 3);
    PublicCatalog::posts($moreJobs, 1);

    $lowRated = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Bravo Placement']);
    PublicCatalog::hire(PublicCatalog::post($lowRated), 3);
    PublicCatalog::reviews($lowRated, [2]);

    $highRated = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Yankee Placement']);
    PublicCatalog::hire(PublicCatalog::post($highRated), 3);
    PublicCatalog::reviews($highRated, [5]);

    $sameAsAardvark = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Able Placement']);
    PublicCatalog::hire(PublicCatalog::post($sameAsAardvark), 3);

    $this->get(route('agencies.index'))
        ->assertInertia(fn (Assert $page) => $page->where('agencies.items', fn ($items) => collect($items)->pluck('name')->all() === [
            'Zulu Placement', 'Yankee Placement', 'Bravo Placement', 'Aardvark Placement', 'Able Placement',
        ]));
});

test('the rating is the average of reviews and null without any', function () {
    $rated = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Rated Agency']);
    PublicCatalog::reviews($rated, [5, 4, 4]);
    PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Unrated Agency']);

    $this->get(route('agencies.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('agencies.items.0.name', 'Rated Agency')
            ->where('agencies.items.0.rating', 4.3)
            ->where('agencies.items.0.reviewCount', 3)
            ->where('agencies.items.1.rating', null)
            ->where('agencies.items.1.reviewCount', 0));
});
