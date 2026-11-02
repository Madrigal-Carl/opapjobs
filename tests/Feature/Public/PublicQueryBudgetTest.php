<?php

use App\Enums\Pathway;
use App\Models\Agency;
use App\Models\Employer;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Support\PublicCatalog;

/**
 * Seeds `$agencies` agencies per pathway, each with job posts of both
 * recruitment types, hires and reviews, and returns the first agency.
 */
function seedPublicCatalog(int $agencies): Agency
{
    $first = null;
    foreach (Pathway::cases() as $pathway) {
        foreach (range(1, $agencies) as $index) {
            $agency = PublicCatalog::agency($pathway);
            $employer = Employer::factory()->for($agency)->create();
            PublicCatalog::posts($agency, 2, ['employer_id' => $employer->id]);
            PublicCatalog::posts($agency, 1, ['recruitment_type' => 'manpooling', 'job_order_number' => null]);
            PublicCatalog::hire(PublicCatalog::post($agency, ['employer_id' => $employer->id]), $index % 3);
            PublicCatalog::reviews($agency, [4, 5]);
            $first ??= $agency;
        }
    }

    return $first;
}

/** Counts the queries one GET issues, ignoring the session and auth lookups the middleware adds. */
function countPageQueries(mixed $test, string $url, ?User $user = null): int
{
    $user === null ? app('auth')->forgetGuards() : $test->actingAs($user);
    DB::flushQueryLog();
    DB::enableQueryLog();
    $test->get($url)->assertOk();
    $count = count(DB::getQueryLog());
    DB::disableQueryLog();

    return $count;
}

/** @return array<string, int> */
function publicPageQueryCounts(mixed $test, Agency $agency, User $applicant): array
{
    $post = JobPost::query()->where('agency_id', $agency->id)->firstOrFail();

    return [
        'home' => countPageQueries($test, route('home')),
        'agencies' => countPageQueries($test, route('agencies.index', ['pathway' => 'seabased'])),
        'jobs' => countPageQueries($test, route('jobs.index')),
        'job' => countPageQueries($test, route('jobs.show', $post->id), $applicant),
        'agency' => countPageQueries($test, route('agencies.show', $agency->slug), $applicant),
    ];
}

test('public pages issue a fixed number of queries however much data there is', function () {
    $applicant = User::factory()->applicant()->create();
    $agency = seedPublicCatalog(2);
    // Warm the permission cache, which loads once per process on the first request.
    publicPageQueryCounts($this, $agency, $applicant);
    $small = publicPageQueryCounts($this, $agency, $applicant);

    seedPublicCatalog(6);
    $large = publicPageQueryCounts($this, $agency, $applicant);

    expect($large)->toBe($small);
    expect($large['home'])->toBeLessThanOrEqual(20)
        ->and($large['agencies'])->toBeLessThanOrEqual(10)
        ->and($large['jobs'])->toBeLessThanOrEqual(10)
        ->and($large['job'])->toBeLessThanOrEqual(16)
        ->and($large['agency'])->toBeLessThanOrEqual(14);
});
