<?php

use App\Enums\ApplicationStage;
use App\Enums\Pathway;
use App\Models\Agency;
use App\Models\JobPost;
use App\Support\PublicAgencyRules;
use Database\Seeders\DemoPublicCatalogSeeder;
use Illuminate\Support\Facades\DB;

/** @return array<string, int> */
function publicCatalogTableCounts(): array
{
    return collect(['users', 'agencies', 'employers', 'job_posts', 'applications', 'application_stage_history', 'agency_reviews', 'applicant_profiles'])
        ->mapWithKeys(fn (string $table): array => [$table => DB::table($table)->count()])->all();
}

test('the public catalog seeder meets the volume targets and is idempotent', function () {
    app()->detectEnvironment(fn () => 'local');

    $this->seed();
    $first = publicCatalogTableCounts();
    $this->seed(DemoPublicCatalogSeeder::class);

    expect(publicCatalogTableCounts())->toBe($first);

    foreach (Pathway::cases() as $pathway) {
        $public = Agency::query()->where('pathway', $pathway)->whereNull('suspended_at');
        $active = JobPost::query()->active()->whereHas('agency', fn ($agency) => $agency->where('pathway', $pathway)->whereNull('suspended_at'));
        $hiring = (clone $public)->whereHas('jobPosts.applications', fn ($application) => $application->where('stage', ApplicationStage::Endorsed));

        expect($public->count())->toBeGreaterThan(PublicAgencyRules::AGENCIES_PER_PAGE)
            ->and($hiring->count())->toBeGreaterThanOrEqual(PublicAgencyRules::TOP_HIRER_RANK_LIMIT)
            ->and((clone $active)->count())->toBeGreaterThan(PublicAgencyRules::JOBS_PER_BATCH * 2)
            ->and((clone $active)->where('job_posts.created_at', '>=', now()->subDays(PublicAgencyRules::RECENT_DAYS))->count())->toBeGreaterThanOrEqual(8)
            ->and((clone $active)->where('recruitment_type', 'manpooling')->count())->toBeGreaterThan(0)
            ->and((clone $active)->where('is_urgent', true)->count())->toBeGreaterThan(0);
    }

    expect(Agency::query()->whereNotNull('suspended_at')->count())->toBeGreaterThanOrEqual(2)
        ->and(Agency::onlyTrashed()->count())->toBeGreaterThanOrEqual(1)
        ->and(JobPost::query()->where('status', 'closed')->count())->toBeGreaterThan(0)
        ->and(JobPost::query()->where('status', 'archived')->count())->toBeGreaterThan(0)
        ->and(JobPost::query()->expired()->count())->toBeGreaterThan(0)
        ->and(DB::table('agency_reviews')->count())->toBeGreaterThan(0);

    expect(DB::table('applications')
        ->join('job_posts', 'job_posts.id', '=', 'applications.job_post_id')
        ->where('applications.stage', ApplicationStage::Endorsed->value)
        ->groupBy('applications.job_post_id', 'job_posts.vacant_positions')
        ->havingRaw('count(*) > job_posts.vacant_positions')
        ->select('applications.job_post_id')->get())->toBeEmpty();
});

test('the public catalog seeder does nothing outside the local environment', function () {
    $before = publicCatalogTableCounts();

    $this->seed(DemoPublicCatalogSeeder::class);

    expect(publicCatalogTableCounts())->toBe($before);
});
