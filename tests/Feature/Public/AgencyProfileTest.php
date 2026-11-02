<?php

use App\Enums\Pathway;
use App\Models\User;
use App\Support\PublicAgencyRules;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\PublicCatalog;

beforeEach(function () {
    $this->applicant = User::factory()->applicant()->create();
});

test('an agency profile shows its details, active job posts and rating summary', function () {
    $agency = PublicCatalog::agency(Pathway::Seabased, [
        'agency_name' => 'Harbor Crew Services', 'headquarters_city' => 'Manila', 'about' => 'Crewing for bulk carriers.',
        'public_email' => 'hello@harbor.example.test', 'facebook_url' => null,
    ]);
    PublicCatalog::posts($agency, 2);
    PublicCatalog::post($agency, ['status' => 'closed']);
    PublicCatalog::hire(PublicCatalog::post($agency, ['status' => 'archived']), 3);
    PublicCatalog::reviews($agency, [5, 5, 4, 2]);

    $this->actingAs($this->applicant)->get(route('agencies.show', $agency->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('agencies/show')
            ->where('agency.name', 'Harbor Crew Services')
            ->where('agency.headquartersCity', 'Manila')
            ->where('agency.about', 'Crewing for bulk carriers.')
            ->where('agency.contact.email', 'hello@harbor.example.test')
            ->where('agency.social.facebook', null)
            ->where('agency.jobs', 2)
            ->where('agency.hiredCount', 3)
            ->where('agency.topHirer', true)
            ->has('jobs', 2)
            ->where('ratingSummary.average', fn ($average) => (float) $average === 4.0)
            ->where('ratingSummary.total', 4)
            ->where('ratingSummary.distribution', fn ($counts) => collect($counts)->all() == [5 => 2, 4 => 1, 3 => 0, 2 => 1, 1 => 0])
            ->where('reviews.total', 4)
            ->where('reviews.page', 1));
});

test('an agency profile without reviews has a null average', function () {
    $agency = PublicCatalog::agency();

    $this->actingAs($this->applicant)->get(route('agencies.show', $agency->slug))
        ->assertInertia(fn (Assert $page) => $page
            ->where('agency.rating', null)
            ->where('ratingSummary.average', null)
            ->where('ratingSummary.total', 0)
            ->where('reviews.data', [])
            ->where('jobs', []));
});

test('agency reviews are paginated and clamp to the last page', function () {
    $agency = PublicCatalog::agency();
    PublicCatalog::reviews($agency, array_fill(0, PublicAgencyRules::REVIEWS_PER_PAGE + 2, 4));

    $this->actingAs($this->applicant)->get(route('agencies.show', $agency->slug))
        ->assertInertia(fn (Assert $page) => $page
            ->has('reviews.data', PublicAgencyRules::REVIEWS_PER_PAGE)
            ->where('reviews.totalPages', 2));

    $this->actingAs($this->applicant)->get(route('agencies.show', [$agency->slug, 'reviews_page' => 50]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('reviews.page', 2)
            ->has('reviews.data', 2));

    $this->actingAs($this->applicant)->get(route('agencies.show', [$agency->slug, 'reviews_page' => '-3']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('reviews.page', 1));
});

test('reviewer names are abbreviated', function () {
    $agency = PublicCatalog::agency();
    $agency->reviews()->create([
        'applicant_user_id' => User::factory()->applicant()->create(['name' => 'Mariel Santos'])->id, 'rating' => 5, 'review_text' => 'Great.',
    ]);

    $this->actingAs($this->applicant)->get(route('agencies.show', $agency->slug))
        ->assertInertia(fn (Assert $page) => $page->where('reviews.data.0.reviewer', 'Mariel S.'));
});

test('suspended, deleted and unknown agencies render the not found state', function (string $state) {
    $agency = PublicCatalog::agency(attributes: $state === 'suspended' ? ['suspended_at' => now()] : []);
    if ($state === 'deleted') {
        $agency->delete();
    }
    $slug = $state === 'unknown' ? 'no-such-agency' : $agency->slug;

    $this->actingAs($this->applicant)->get(route('agencies.show', $slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('agency', null)->missing('jobs'));
})->with(['suspended', 'deleted', 'unknown']);

test('an unverified agency profile is public but not marked verified', function () {
    $agency = PublicCatalog::agency(attributes: ['verified_at' => null]);

    $this->actingAs($this->applicant)->get(route('agencies.show', $agency->slug))
        ->assertInertia(fn (Assert $page) => $page->where('agency.verified', false));
});
