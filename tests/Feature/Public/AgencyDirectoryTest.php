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
            ->where('agencies.items.0.name', 'Land Agency')
            ->where('pathwayCounts', ['landbased' => 1, 'seabased' => 1]));
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
            ->where('agencies.items.0.name', 'Saudi Agency')
            ->where('pathwayCounts.landbased', 1));
});

test('the country filter does not match a hidden manpooling employer city', function () {
    $agency = PublicCatalog::agency(Pathway::Landbased);
    PublicCatalog::post($agency, ['recruitment_type' => 'manpooling', 'work_location' => 'Secret Plant, Jubail, Saudi Arabia']);

    expect($this->get(route('agencies.index', ['country' => 'Jubail']))->inertiaProps('agencies.items'))->toBe([])
        ->and($this->get(route('agencies.index', ['country' => 'Saudi Arabia']))->inertiaProps('agencies.items'))->toHaveCount(1);
});
