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
