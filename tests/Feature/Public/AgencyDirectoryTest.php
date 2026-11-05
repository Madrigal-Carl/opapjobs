<?php

use App\Enums\Pathway;
use App\Support\PublicAgencyRules;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\PublicCatalog;

test('an unknown pathway falls back to landbased instead of failing validation', function () {
    PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Land Agency']);
    PublicCatalog::agency(Pathway::Seabased, ['agency_name' => 'Sea Agency']);

    $this->get(route('agencies.index', ['pathway' => 'airborne', 'page' => 'abc']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.pathway', 'landbased')
            ->where('filters.page', 1)
            ->has('agencies.items', 1)
            ->where('agencies.items.0.name', 'Land Agency'));
});

test('the directory shows twelve agencies per page and clamps pages past the end', function () {
    foreach (range(1, PublicAgencyRules::AGENCIES_PER_PAGE + 3) as $index) {
        PublicCatalog::agency(Pathway::Landbased, ['agency_name' => sprintf('Agency %02d', $index)]);
    }

    $this->get(route('agencies.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('agencies.items', PublicAgencyRules::AGENCIES_PER_PAGE)
            ->where('agencies.total', 15)
            ->where('agencies.totalPages', 2));

    $this->get(route('agencies.index', ['page' => 99]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('agencies.page', 2)
            ->where('filters.page', 2)
            ->has('agencies.items', 3)
            ->where('agencies.items.0.name', 'Agency 13'));
});

test('the keyword matches name, city and licence and treats wildcards literally', function () {
    PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Bright 100% Manpower', 'headquarters_city' => 'Makati']);
    PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Plain Manpower', 'headquarters_city' => 'Cebu City']);
    PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Licence Manpower', 'dmw_license_number' => 'DMW_777']);

    $names = fn (array $query): array => $this->get(route('agencies.index', $query))->inertiaProps('agencies.items');

    expect(collect($names(['q' => '100%']))->pluck('name')->all())->toBe(['Bright 100% Manpower'])
        ->and(collect($names(['q' => '%']))->pluck('name')->all())->toBe(['Bright 100% Manpower'])
        ->and(collect($names(['q' => 'cebu']))->pluck('name')->all())->toBe(['Plain Manpower'])
        ->and(collect($names(['q' => 'dmw_7']))->pluck('name')->all())->toBe(['Licence Manpower'])
        ->and(collect($names(['q' => '_']))->pluck('name')->all())->toBe(['Licence Manpower'])
        ->and($names(['q' => '   ']))->toHaveCount(3);
});

test('the keyword is trimmed and capped at the maximum length', function () {
    $this->get(route('agencies.index', ['q' => '  '.str_repeat('a', 150).'  ']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('filters.q', str_repeat('a', PublicAgencyRules::KEYWORD_MAX_LENGTH)));
});

test('the country filter keeps agencies with an active job post there', function () {
    $saudi = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Saudi Agency']);
    PublicCatalog::post($saudi, ['work_location' => 'Riyadh, Saudi Arabia']);
    $closed = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Closed Saudi Agency']);
    PublicCatalog::post($closed, ['work_location' => 'Jeddah, Saudi Arabia', 'status' => 'closed']);
    $qatar = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Qatar Agency']);
    PublicCatalog::post($qatar, ['work_location' => 'Doha, Qatar']);

    $this->get(route('agencies.index', ['country' => 'Saudi Arabia']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('agencies.items', 1)
            ->where('agencies.items.0.name', 'Saudi Agency'));
});

test('the country filter does not match a hidden manpooling employer city', function () {
    $agency = PublicCatalog::agency(Pathway::Landbased);
    PublicCatalog::post($agency, ['recruitment_type' => 'manpooling', 'work_location' => 'Secret Plant, Jubail, Saudi Arabia']);

    expect($this->get(route('agencies.index', ['country' => 'Jubail']))->inertiaProps('agencies.items'))->toBe([])
        ->and($this->get(route('agencies.index', ['country' => 'Saudi Arabia']))->inertiaProps('agencies.items'))->toHaveCount(1);
});

test('the country suggestions are the places with an active job post on the current pathway', function () {
    $land = PublicCatalog::agency(Pathway::Landbased);
    PublicCatalog::post($land, ['work_location' => 'Doha, Qatar']);
    PublicCatalog::post($land, ['work_location' => 'Al Khor, Qatar']);
    PublicCatalog::post($land, ['work_location' => 'Riyadh, Saudi Arabia']);
    PublicCatalog::post($land, ['work_location' => 'Berlin, Germany', 'status' => 'closed']);
    $suspended = PublicCatalog::agency(Pathway::Landbased, ['suspended_at' => now()]);
    PublicCatalog::post($suspended, ['work_location' => 'Tokyo, Japan']);
    $sea = PublicCatalog::agency(Pathway::Seabased);
    PublicCatalog::post($sea, ['work_location' => 'International waters; joining in Manama, Bahrain']);

    expect($this->get(route('agencies.index'))->inertiaProps('countryOptions'))->toBe(['Qatar', 'Saudi Arabia'])
        ->and($this->get(route('agencies.index', ['pathway' => 'seabased']))->inertiaProps('countryOptions'))->toBe(['Bahrain', 'International waters']);
});

test('every country suggestion finds at least one agency', function () {
    $land = PublicCatalog::agency(Pathway::Landbased);
    PublicCatalog::post($land, ['work_location' => 'Doha, Qatar']);
    $sea = PublicCatalog::agency(Pathway::Seabased);
    PublicCatalog::post($sea, ['work_location' => 'International waters; joining in Muscat, Oman']);
    PublicCatalog::post($sea, ['recruitment_type' => 'manpooling', 'job_order_number' => null, 'work_location' => 'International waters; joining in Dubai, United Arab Emirates']);

    foreach (['landbased', 'seabased'] as $pathway) {
        $options = $this->get(route('agencies.index', ['pathway' => $pathway]))->inertiaProps('countryOptions');

        expect($options)->not->toBeEmpty();

        foreach ($options as $country) {
            expect($this->get(route('agencies.index', ['pathway' => $pathway, 'country' => $country]))->inertiaProps('agencies.total'))->toBeGreaterThan(0);
        }
    }
});

test('the country suggestions never reveal a hidden manpooling employer city', function () {
    $agency = PublicCatalog::agency(Pathway::Landbased);
    PublicCatalog::post($agency, ['recruitment_type' => 'manpooling', 'job_order_number' => null, 'work_location' => 'Secret Plant, Jubail, Saudi Arabia']);

    expect($this->get(route('agencies.index'))->inertiaProps('countryOptions'))->toBe(['Saudi Arabia']);
});

test('the keyword and country narrow the directory together and the suggestions stay available', function () {
    $match = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Northwind Manpower']);
    PublicCatalog::post($match, ['work_location' => 'Doha, Qatar']);
    $wrongCountry = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Northwind Gulf']);
    PublicCatalog::post($wrongCountry, ['work_location' => 'Kuwait City, Kuwait']);
    $wrongName = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Harbor Staffing']);
    PublicCatalog::post($wrongName, ['work_location' => 'Doha, Qatar']);

    $this->get(route('agencies.index', ['q' => 'northwind', 'country' => 'qatar']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('agencies.items', 1)
            ->where('agencies.items.0.name', 'Northwind Manpower')
            ->where('filters.q', 'northwind')
            ->where('filters.country', 'qatar')
            ->where('countryOptions', ['Kuwait', 'Qatar']));
});
