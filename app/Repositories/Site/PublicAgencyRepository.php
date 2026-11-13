<?php

namespace App\Repositories\Site;

use App\Enums\ApplicationStage;
use App\Enums\Pathway;
use App\Models\Agency;
use App\Models\AgencyReview;
use App\Repositories\Site\Concerns\SearchesPublicText;
use App\Support\PublicAgencyFilters;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Reads for public agencies. Every query starts from `cards()`, so the
 * open-jobs count, hired count and rating are computed the same way on every
 * page, and every ranking goes through `ranked()`.
 */
class PublicAgencyRepository
{
    use SearchesPublicText;

    private const CARD_COLUMNS = [
        'agencies.id', 'agencies.slug', 'agencies.agency_name', 'agencies.pathway', 'agencies.dmw_license_number',
        'agencies.headquarters_city', 'agencies.verified_at', 'agencies.deleted_at',
    ];

    private const PROFILE_COLUMNS = [
        'agencies.about', 'agencies.year_established', 'agencies.agency_size', 'agencies.public_phone',
        'agencies.public_email', 'agencies.public_address', 'agencies.facebook_url', 'agencies.instagram_url',
        'agencies.x_url', 'agencies.website_url',
    ];

    /**
     * Public agencies with their derived aggregates: `open_jobs_count`
     * (active job posts), `hired_count` (hired applications on job posts in
     * any status), `reviews_count` and `reviews_avg_rating` (non-archived
     * reviews; the soft-delete scope applies inside the aggregates).
     *
     * @param  list<string>  $extraColumns
     * @return Builder<Agency>
     */
    private function cards(array $extraColumns = []): Builder
    {
        $activeOnly = fn ($query) => $query->active();

        return Agency::query()
            ->whereNull('agencies.suspended_at')
            ->select([...self::CARD_COLUMNS, ...$extraColumns])
            ->withCount([
                'jobPosts as open_jobs_count' => $activeOnly,
                'applications as hired_count' => fn (Builder $query) => $query->where('applications.stage', ApplicationStage::Endorsed->value),
                'reviews',
            ])
            ->withAvg('reviews', 'rating');
    }

    /**
     * The Top Hirer ranking: hired count, then open jobs, then rating, then
     * name, then id so ties never depend on the database.
     *
     * Wrapped in a sub-select because PostgreSQL cannot use an output alias
     * inside an ORDER BY expression such as `COALESCE(...)`.
     *
     * @param  Builder<Agency>  $cards
     * @return Builder<Agency>
     */
    private function ranked(Builder $cards): Builder
    {
        return Agency::query()->fromSub($cards, 'agencies')
            ->orderByDesc('hired_count')
            ->orderByDesc('open_jobs_count')
            ->orderByRaw('COALESCE(reviews_avg_rating, 0) DESC')
            ->orderBy('agency_name')
            ->orderBy('id');
    }

    /** @return Collection<int, Agency> */
    public function topRanked(Pathway $pathway, int $limit): Collection
    {
        return $this->ranked($this->cards()->where('agencies.pathway', $pathway->value))->limit($limit)->get();
    }

    /**
     * Newest verified agencies first; unverified agencies only fill the
     * remaining slots. `CASE` keeps NULL ordering identical on every driver.
     *
     * @return Collection<int, Agency>
     */
    public function newest(Pathway $pathway, int $limit): Collection
    {
        return $this->cards()->where('agencies.pathway', $pathway->value)
            ->orderByRaw('CASE WHEN agencies.verified_at IS NULL THEN 1 ELSE 0 END')
            ->orderByDesc('agencies.verified_at')
            ->orderByDesc('agencies.id')
            ->limit($limit)->get();
    }

    /** @return LengthAwarePaginator<int, Agency> */
    public function paginateRanked(PublicAgencyFilters $filters, int $perPage): LengthAwarePaginator
    {
        $query = $this->ranked($this->filtered($this->cards(), $filters)->where('agencies.pathway', $filters->pathway->value));
        $results = $query->paginate($perPage, page: $filters->page);

        if ($results->currentPage() > $results->lastPage()) {
            $results = $query->paginate($perPage, page: $results->lastPage(), total: $results->total());
        }

        return $results;
    }

    /** @return array{landbased: int, seabased: int} */
    public function countsByPathway(): array
    {
        $counts = Agency::query()->whereNull('agencies.suspended_at')->toBase()->selectRaw('agencies.pathway AS pathway, COUNT(*) AS total')->groupBy('agencies.pathway')->pluck('total', 'pathway');

        return ['landbased' => (int) ($counts['landbased'] ?? 0), 'seabased' => (int) ($counts['seabased'] ?? 0)];
    }

    /**
     * Distinct public locations of the pathway's active job posts, read through
     * the same SQL the country filter searches, so nothing hidden can be offered.
     *
     * @return list<string>
     */
    public function activeLocations(Pathway $pathway): array
    {
        $locations = $this->publicJobPosts()
            ->whereIn('job_posts.agency_id', $this->publicAgencyIds($pathway->value))
            ->toBase()
            ->selectRaw($this->publicLocationSql().' AS location')
            ->distinct()
            ->pluck('location')
            ->all();

        return array_values(array_filter($locations, 'is_string'));
    }

    public function findPublicBySlug(string $slug): ?Agency
    {
        return $this->cards(self::PROFILE_COLUMNS)->where('agencies.slug', $slug)->first();
    }

    public function findPublicById(int $id): ?Agency
    {
        return $this->cards(['agencies.about', 'agencies.year_established', 'agencies.agency_size'])->whereKey($id)->first();
    }

    /** @return array<int, int> Star (1–5) => number of non-archived reviews */
    public function ratingDistribution(int $agencyId): array
    {
        $counts = AgencyReview::query()->where('agency_id', $agencyId)->toBase()
            ->selectRaw('rating, COUNT(*) AS total')->groupBy('rating')->pluck('total', 'rating');

        $distribution = [];
        foreach ([5, 4, 3, 2, 1] as $star) {
            $distribution[$star] = (int) ($counts[$star] ?? 0);
        }

        return $distribution;
    }

    /** @return LengthAwarePaginator<int, AgencyReview> */
    public function paginateReviews(int $agencyId, int $perPage, int $page): LengthAwarePaginator
    {
        $query = AgencyReview::query()->where('agency_id', $agencyId)
            ->select(['id', 'agency_id', 'applicant_user_id', 'rating', 'review_text', 'created_at'])
            ->with('applicant:id,name')
            ->orderByDesc('created_at')->orderByDesc('id');
        $results = $query->paginate($perPage, pageName: 'reviews_page', page: $page);

        if ($results->currentPage() > $results->lastPage()) {
            $results = $query->paginate($perPage, pageName: 'reviews_page', page: $results->lastPage(), total: $results->total());
        }

        return $results;
    }

    /**
     * @template TBuilder of Builder<Agency>
     *
     * @param  TBuilder  $query
     * @return TBuilder
     */
    private function filtered(Builder $query, PublicAgencyFilters $filters): Builder
    {
        if ($filters->q !== null) {
            $pattern = $this->likePattern($filters->q);
            $query->where(function (Builder $search) use ($pattern): void {
                $this->orWhereContains($search, 'agencies.agency_name', $pattern);
                $this->orWhereContains($search, 'agencies.headquarters_city', $pattern);
                $this->orWhereContains($search, 'agencies.dmw_license_number', $pattern);
            });
        }

        if ($filters->country !== null) {
            $pattern = $this->likePattern($filters->country);
            $location = $this->publicLocationSql();
            $query->whereHas('jobPosts', function (Builder $posts) use ($pattern, $location): void {
                $posts->active();
                $this->whereContains($posts, $location, $pattern);
            });
        }

        return $query;
    }
}
