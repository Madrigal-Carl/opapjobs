<?php

namespace App\Actions\Site;

use App\Models\Agency;
use App\Models\AgencyReview;
use App\Models\JobPost;
use App\Services\Site\PublicAgencyService;
use App\Services\Site\PublicJobPostService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ShowPublicAgencyAction
{
    public function __construct(private PublicAgencyService $agencies, private PublicJobPostService $posts) {}

    /**
     * @return null|array{
     *     agency: Agency,
     *     jobs: Collection<int, JobPost>,
     *     ratingSummary: array{average: float|null, total: int, distribution: array<int, int>},
     *     reviews: LengthAwarePaginator<int, AgencyReview>
     * }
     */
    public function execute(string $slug, int $reviewsPage): ?array
    {
        return DB::transaction(function () use ($slug, $reviewsPage): ?array {
            $profile = $this->agencies->profile($slug, $reviewsPage);

            return $profile === null ? null : [...$profile, 'jobs' => $this->posts->forAgency($profile['agency']->id)];
        });
    }
}
