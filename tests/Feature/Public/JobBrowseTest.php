<?php

use App\Enums\Pathway;
use App\Models\Employer;
use App\Support\PublicAgencyRules;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\PublicCatalog;

/** @return list<string> */
function browsedTitles(mixed $test, array $query = []): array
{
    return collect($test->get(route('jobs.index', $query))->inertiaProps('jobPosts'))->pluck('title')->all();
}

test('the jobs page lists active public job posts newest first in batches', function () {
    $agency = PublicCatalog::agency(Pathway::Landbased);
    PublicCatalog::posts($agency, PublicAgencyRules::JOBS_PER_BATCH + 4);

    $first = $this->get(route('jobs.index'))->assertOk();
    $first->assertInertia(fn (Assert $page) => $page
        ->component('jobs/index')
        ->has('jobPosts', PublicAgencyRules::JOBS_PER_BATCH)
        ->where('jobPostsMeta', ['page' => 1, 'hasMore' => true, 'nextPage' => 2, 'total' => 14])
        ->where('filters', ['q' => '', 'country' => '', 'filters' => []]));

    $second = $this->get(route('jobs.index', ['page' => 2]));
    $second->assertInertia(fn (Assert $page) => $page
        ->has('jobPosts', 4)
        ->where('jobPostsMeta.hasMore', false)
        ->where('jobPostsMeta.nextPage', null));

    $firstIds = collect($first->inertiaProps('jobPosts'))->pluck('id');
    $secondIds = collect($second->inertiaProps('jobPosts'))->pluck('id');
    $createdAt = collect([...$first->inertiaProps('jobPosts'), ...$second->inertiaProps('jobPosts')])->pluck('postedAt');

    expect($firstIds->intersect($secondIds))->toBeEmpty()
        ->and($createdAt->all())->toBe($createdAt->sortDesc()->values()->all());
});

test('load more merges job posts on partial reloads', function () {
    PublicCatalog::posts(PublicCatalog::agency(), 12);

    $this->get(route('jobs.index'))
        ->assertInertia(fn (Assert $page) => $page->where('jobPosts', fn ($posts) => count($posts) === PublicAgencyRules::JOBS_PER_BATCH));

    $page = $this->get(route('jobs.index'))->viewData('page');

    expect($page['mergeProps'])->toBe(['jobPosts'])
        ->and($page['matchPropsOn'])->toBe(['jobPosts.id']);
});

test('toggles combine with AND and unknown toggles are dropped', function () {
    $land = PublicCatalog::agency(Pathway::Landbased);
    $sea = PublicCatalog::agency(Pathway::Seabased);
    PublicCatalog::post($land, ['job_title' => 'Urgent Recent Land', 'is_urgent' => true]);
    PublicCatalog::post($land, ['job_title' => 'Urgent Old Land', 'is_urgent' => true, 'created_at' => now()->subDays(20)]);
    PublicCatalog::post($land, ['job_title' => 'Calm Recent Land']);
    PublicCatalog::post($sea, ['job_title' => 'Urgent Recent Sea', 'is_urgent' => true]);

    expect(browsedTitles($this, ['filters' => ['landbased', 'urgent', 'recent']]))->toBe(['Urgent Recent Land'])
        ->and(browsedTitles($this, ['filter' => 'seabased']))->toBe(['Urgent Recent Sea'])
        ->and(browsedTitles($this, ['filters' => ['urgent', 'bogus']]))->toHaveCount(3);

    $this->get(route('jobs.index', ['filters' => ['urgent', 'bogus']]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.filters', ['urgent'])
            ->missing('filterCounts'));
});

test('landbased and seabased exclude each other and the last one asked for wins', function () {
    PublicCatalog::post(PublicCatalog::agency(Pathway::Landbased), ['job_title' => 'Land Urgent', 'is_urgent' => true]);
    PublicCatalog::post(PublicCatalog::agency(Pathway::Seabased), ['job_title' => 'Sea Urgent', 'is_urgent' => true]);

    $this->get(route('jobs.index', ['filters' => ['seabased', 'urgent', 'landbased']]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.filters', ['landbased', 'urgent'])
            ->where('jobPosts', fn ($posts) => collect($posts)->pluck('title')->all() === ['Land Urgent']));

    $this->get(route('jobs.index', ['filters' => ['landbased', 'recent'], 'filter' => 'seabased']))
        ->assertInertia(fn (Assert $page) => $page->where('filters.filters', ['seabased', 'recent']));
});

/**
 * One job post per pathway × urgent × recent, titled e.g. "land urgent recent".
 * The old ones are older than RECENT_DAYS.
 */
function filterMatrix(): void
{
    $agencies = ['land' => PublicCatalog::agency(Pathway::Landbased), 'sea' => PublicCatalog::agency(Pathway::Seabased)];

    foreach ($agencies as $pathway => $agency) {
        foreach ([true, false] as $isUrgent) {
            foreach ([true, false] as $isRecent) {
                PublicCatalog::post($agency, [
                    'job_title' => $pathway.' '.($isUrgent ? 'urgent' : 'calm').' '.($isRecent ? 'recent' : 'old'),
                    'is_urgent' => $isUrgent,
                    'created_at' => $isRecent ? now()->subDay() : now()->subDays(PublicAgencyRules::RECENT_DAYS + 3),
                ]);
            }
        }
    }
}

/** @return list<string> */
function sortedTitles(mixed $test, array $query = []): array
{
    return collect(browsedTitles($test, $query))->sort()->values()->all();
}

test('every filter combination returns exactly the matching job posts', function (array $filters, array $expected) {
    filterMatrix();

    $this->get(route('jobs.index', ['filters' => $filters]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('filters.filters', $filters));

    expect(sortedTitles($this, ['filters' => $filters]))->toBe(collect($expected)->sort()->values()->all());
})->with([
    'none' => [[], ['land urgent recent', 'land urgent old', 'land calm recent', 'land calm old', 'sea urgent recent', 'sea urgent old', 'sea calm recent', 'sea calm old']],
    'landbased' => [['landbased'], ['land urgent recent', 'land urgent old', 'land calm recent', 'land calm old']],
    'seabased' => [['seabased'], ['sea urgent recent', 'sea urgent old', 'sea calm recent', 'sea calm old']],
    'urgent' => [['urgent'], ['land urgent recent', 'land urgent old', 'sea urgent recent', 'sea urgent old']],
    'recent' => [['recent'], ['land urgent recent', 'land calm recent', 'sea urgent recent', 'sea calm recent']],
    'urgent, recent' => [['urgent', 'recent'], ['land urgent recent', 'sea urgent recent']],
    'landbased, urgent' => [['landbased', 'urgent'], ['land urgent recent', 'land urgent old']],
    'landbased, recent' => [['landbased', 'recent'], ['land urgent recent', 'land calm recent']],
    'landbased, urgent, recent' => [['landbased', 'urgent', 'recent'], ['land urgent recent']],
    'seabased, urgent' => [['seabased', 'urgent'], ['sea urgent recent', 'sea urgent old']],
    'seabased, recent' => [['seabased', 'recent'], ['sea urgent recent', 'sea calm recent']],
    'seabased, urgent, recent' => [['seabased', 'urgent', 'recent'], ['sea urgent recent']],
]);

test('the recent filter lists newest first', function () {
    $agency = PublicCatalog::agency();
    PublicCatalog::post($agency, ['job_title' => 'Two days', 'created_at' => now()->subDays(2)]);
    PublicCatalog::post($agency, ['job_title' => 'One hour', 'created_at' => now()->subHour()]);
    PublicCatalog::post($agency, ['job_title' => 'Too old', 'created_at' => now()->subDays(PublicAgencyRules::RECENT_DAYS + 1)]);

    expect(browsedTitles($this, ['filters' => ['recent']]))->toBe(['One hour', 'Two days']);
});

test('the pathway filter follows the agency, not the job category', function () {
    PublicCatalog::post(PublicCatalog::agency(Pathway::Seabased), [
        'job_title' => 'Sea agency, land category', 'job_subcategory_id' => PublicCatalog::subcategory(Pathway::Landbased)->id,
    ]);
    PublicCatalog::post(PublicCatalog::agency(Pathway::Landbased), ['job_title' => 'Land agency']);

    expect(browsedTitles($this, ['filters' => ['seabased']]))->toBe(['Sea agency, land category'])
        ->and(browsedTitles($this, ['filters' => ['landbased']]))->toBe(['Land agency']);
});

test('asking for both pathways never returns both', function (array $filters) {
    filterMatrix();

    $titles = browsedTitles($this, ['filters' => $filters]);
    $pathways = collect($titles)->map(fn (string $title) => explode(' ', $title)[0])->unique();

    expect($titles)->not->toBeEmpty()->and($pathways)->toHaveCount(1);
})->with([
    [['landbased', 'seabased']],
    [['seabased', 'landbased', 'urgent']],
    [['urgent', 'landbased', 'recent', 'seabased']],
]);

test('removing a filter brings its job posts back', function () {
    filterMatrix();

    expect(browsedTitles($this, ['filters' => ['landbased', 'urgent', 'recent']]))->toHaveCount(1)
        ->and(browsedTitles($this, ['filters' => ['landbased', 'urgent']]))->toHaveCount(2)
        ->and(browsedTitles($this, ['filters' => ['landbased']]))->toHaveCount(4)
        ->and(browsedTitles($this, ['filters' => []]))->toHaveCount(8)
        ->and(browsedTitles($this))->toHaveCount(8);
});

test('the next page keeps the filters', function () {
    $land = PublicCatalog::agency(Pathway::Landbased);
    PublicCatalog::posts($land, PublicAgencyRules::JOBS_PER_BATCH + 3, ['is_urgent' => true]);
    PublicCatalog::posts($land, 4, ['is_urgent' => false]);
    PublicCatalog::posts(PublicCatalog::agency(Pathway::Seabased), 5, ['is_urgent' => true]);

    $query = ['filters' => ['landbased', 'urgent']];
    $first = $this->get(route('jobs.index', $query));
    $second = $this->get(route('jobs.index', [...$query, 'page' => 2]));

    $first->assertInertia(fn (Assert $page) => $page
        ->has('jobPosts', PublicAgencyRules::JOBS_PER_BATCH)
        ->where('jobPostsMeta.total', PublicAgencyRules::JOBS_PER_BATCH + 3)
        ->where('jobPostsMeta.nextPage', 2));
    $second->assertInertia(fn (Assert $page) => $page
        ->has('jobPosts', 3)
        ->where('jobPostsMeta.hasMore', false)
        ->where('filters.filters', ['landbased', 'urgent']));

    $rows = collect([...$first->inertiaProps('jobPosts'), ...$second->inertiaProps('jobPosts')]);

    expect($rows->pluck('id')->unique())->toHaveCount(PublicAgencyRules::JOBS_PER_BATCH + 3)
        ->and($rows->every(fn (array $row) => $row['pathway'] === 'landbased' && $row['urgent'] === true))->toBeTrue();
});

test('the keyword searches title, location, category and agency and is trimmed and capped', function () {
    $agency = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Northwind Manpower']);
    $post = PublicCatalog::post($agency, ['job_title' => 'Electrician', 'work_location' => 'Doha, Qatar']);
    PublicCatalog::post(PublicCatalog::agency(), ['job_title' => 'Cook']);

    expect(browsedTitles($this, ['q' => '  electrician  ']))->toBe(['Electrician'])
        ->and(browsedTitles($this, ['q' => 'doha']))->toBe(['Electrician'])
        ->and(browsedTitles($this, ['q' => 'NORTHWIND']))->toBe(['Electrician'])
        ->and(browsedTitles($this, ['q' => $post->subcategory->subcategory_name]))->toContain('Electrician')
        ->and(browsedTitles($this, ['country' => 'Qatar']))->toBe(['Electrician']);

    $this->get(route('jobs.index', ['q' => str_repeat('b', 140)]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('filters.q', str_repeat('b', PublicAgencyRules::KEYWORD_MAX_LENGTH)));
});

test('percent and underscore in the keyword are matched literally', function () {
    $agency = PublicCatalog::agency();
    PublicCatalog::post($agency, ['job_title' => 'Nurse 100% Day Shift']);
    PublicCatalog::post($agency, ['job_title' => 'Rig_Operator']);
    PublicCatalog::post($agency, ['job_title' => 'Rig Operator']);

    expect(browsedTitles($this, ['q' => '%']))->toBe(['Nurse 100% Day Shift'])
        ->and(browsedTitles($this, ['q' => 'rig_']))->toBe(['Rig_Operator']);
});

test('suspended, deleted and inactive job posts never appear', function () {
    $public = PublicCatalog::agency();
    PublicCatalog::post($public, ['job_title' => 'Shown']);
    PublicCatalog::post($public, ['job_title' => 'Closed', 'status' => 'closed']);
    PublicCatalog::post($public, ['job_title' => 'Archived', 'status' => 'archived']);
    PublicCatalog::post($public, ['job_title' => 'Expired', 'closing_date' => now()->subDay()->toDateString()]);
    PublicCatalog::post(PublicCatalog::agency(attributes: ['suspended_at' => now()]), ['job_title' => 'Suspended']);
    $deleted = PublicCatalog::agency();
    PublicCatalog::post($deleted, ['job_title' => 'Deleted']);
    $deleted->delete();

    expect(browsedTitles($this))->toBe(['Shown']);
});

test('manpooling job posts are redacted on the server and cannot be found by the hidden employer', function () {
    $agency = PublicCatalog::agency();
    $employer = Employer::factory()->for($agency)->create([
        'employer_name' => 'Hidden Petrochem Co', 'employer_location' => 'Jubail Industrial City', 'employer_license_number' => 'SECRET-LIC',
    ]);
    PublicCatalog::post($agency, [
        'job_title' => 'Pipe Fitter', 'recruitment_type' => 'manpooling', 'job_order_number' => null,
        'employer_id' => $employer->id, 'work_location' => 'Jubail Plant 4, Jubail, Saudi Arabia',
    ]);

    $response = $this->get(route('jobs.index'));
    $post = $response->inertiaProps('jobPosts.0');

    expect($post['employerHidden'])->toBeTrue()
        ->and($post['employer'])->toBeNull()
        ->and($post['location'])->toBe('Saudi Arabia')
        ->and($response->getContent())->not->toContain('Hidden Petrochem')->not->toContain('Jubail')->not->toContain('SECRET-LIC')
        ->and(browsedTitles($this, ['q' => 'Petrochem']))->toBe([])
        ->and(browsedTitles($this, ['q' => 'Jubail']))->toBe([])
        ->and(browsedTitles($this, ['country' => 'Jubail']))->toBe([])
        ->and(browsedTitles($this, ['q' => 'Saudi']))->toBe(['Pipe Fitter']);
});

test('a job order post can be found by its employer', function () {
    $agency = PublicCatalog::agency();
    $employer = Employer::factory()->for($agency)->create(['employer_name' => 'Open Hospital Group']);
    PublicCatalog::post($agency, ['job_title' => 'Staff Nurse', 'employer_id' => $employer->id]);

    expect(browsedTitles($this, ['q' => 'hospital group']))->toBe(['Staff Nurse'])
        ->and($this->get(route('jobs.index'))->inertiaProps('jobPosts.0.employer'))->toBe('Open Hospital Group');
});
