<?php

namespace Tests\Support;

use App\Enums\Pathway;
use App\Models\Agency;
use App\Models\AgencyReview;
use App\Models\Application;
use App\Models\JobCategory;
use App\Models\JobPost;
use App\Models\JobSubcategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Sequence;

/** Small builders for the public-page tests; SQLite has no demo data. */
class PublicCatalog
{
    /** @param array<string, mixed> $attributes */
    public static function agency(Pathway $pathway = Pathway::Landbased, array $attributes = []): Agency
    {
        return Agency::factory()->create(['pathway' => $pathway, 'verified_at' => now()->subMonth(), ...$attributes]);
    }

    public static function subcategory(Pathway $pathway = Pathway::Landbased): JobSubcategory
    {
        return JobSubcategory::factory()->for(JobCategory::factory()->state(['pathway' => $pathway]), 'category')->create();
    }

    /** @param array<string, mixed> $attributes */
    public static function post(Agency $agency, array $attributes = []): JobPost
    {
        $poster = User::factory()->agency()->forAgency($agency)->create();
        $subcategory = $attributes['job_subcategory_id'] ?? self::sharedSubcategory($agency->pathway)->id;

        return JobPost::factory()->create([
            'agency_id' => $agency->id, 'posted_by_user_id' => $poster->id, 'job_subcategory_id' => $subcategory,
            'work_location' => 'Riyadh, Saudi Arabia', ...$attributes,
        ]);
    }

    public static function hire(JobPost $post, int $count): void
    {
        if ($count > 0) {
            Application::factory()->count($count)->endorsed()->for($post, 'jobPost')->create();
        }
    }

    /** @param list<int> $ratings */
    public static function reviews(Agency $agency, array $ratings): void
    {
        foreach ($ratings as $rating) {
            AgencyReview::query()->create([
                'agency_id' => $agency->id, 'applicant_user_id' => User::factory()->applicant()->create()->id,
                'rating' => $rating, 'review_text' => 'Clear and helpful coordinators.',
            ]);
        }
    }

    /** @param array<string, mixed> $attributes */
    public static function posts(Agency $agency, int $count, array $attributes = []): void
    {
        $poster = User::factory()->agency()->forAgency($agency)->create();
        JobPost::factory()->count($count)->state(new Sequence(fn (Sequence $sequence): array => [
            'created_at' => now()->subMinutes(10 + $sequence->index),
        ]))->create([
            'agency_id' => $agency->id, 'posted_by_user_id' => $poster->id,
            'job_subcategory_id' => self::sharedSubcategory($agency->pathway)->id, ...$attributes,
        ]);
    }

    /** One subcategory per pathway, so related-job lookups have a shared category. */
    public static function sharedSubcategory(Pathway $pathway): JobSubcategory
    {
        return JobSubcategory::query()
            ->whereHas('category', fn ($category) => $category->where('pathway', $pathway))
            ->oldest('id')
            ->first() ?? self::subcategory($pathway);
    }
}
