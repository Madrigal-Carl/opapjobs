<?php

namespace App\Services\Site;

use App\Enums\Pathway;
use App\Models\Agency;
use App\Models\AgencyReview;
use App\Repositories\Site\PublicAgencyRepository;
use App\Support\PublicAgencyFilters;
use App\Support\PublicAgencyRules;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

/**
 * The Top Hirer rule and the agency side of the public pages.
 *
 * Top Hirer: an agency ranks within the first `TOP_HIRER_RANK_LIMIT` of its
 * pathway (hired count, open jobs, rating, name) and has at least one hired
 * applicant. Every page derives the flag from the same ranking query, so the
 * landing page, directory and profiles cannot disagree.
 */
class PublicAgencyService
{
    public function __construct(private PublicAgencyRepository $agencies) {}

    /**
     * @return array{
     *     agencies: array<string, Collection<int, Agency>>,
     *     topHirers: array<string, Collection<int, Agency>>,
     *     agencyCounts: array{landbased: int, seabased: int},
     *     topHirerCounts: array<string, int>
     * }
     */
    public function home(): array
    {
        $agencies = $topHirers = $topHirerCounts = [];

        foreach (Pathway::cases() as $pathway) {
            $ranked = $this->agencies->topRanked($pathway, PublicAgencyRules::TOP_HIRER_RANK_LIMIT);
            $topIds = $this->flaggedIds($ranked);
            // Only flagged agencies belong in the Top Hirers row; zero-hire agencies never appear there.
            $shown = $ranked->filter(fn (Agency $agency): bool => in_array($agency->id, $topIds, true))
                ->take(PublicAgencyRules::HOME_TOP_HIRERS_PER_PATHWAY)->values();
            $shownIds = $shown->pluck('id')->all();
            $newest = $this->agencies->newest($pathway, PublicAgencyRules::HOME_AGENCIES_PER_PATHWAY + PublicAgencyRules::HOME_TOP_HIRERS_PER_PATHWAY);
            // Prefer agencies the top-hirer row does not already show; repeat them only to fill the row.
            [$repeat, $others] = $newest->partition(fn (Agency $agency): bool => in_array($agency->id, $shownIds, true));

            $topHirers[$pathway->value] = $this->mark($shown, $topIds);
            $agencies[$pathway->value] = $this->mark($others->concat($repeat)->take(PublicAgencyRules::HOME_AGENCIES_PER_PATHWAY)->values(), $topIds);
            $topHirerCounts[$pathway->value] = count($topIds);
        }

        return [
            'agencies' => $agencies, 'topHirers' => $topHirers,
            'agencyCounts' => $this->agencies->countsByPathway(), 'topHirerCounts' => $topHirerCounts,
        ];
    }

    /** @return array{agencies: LengthAwarePaginator<int, Agency>, counts: array{landbased: int, seabased: int}} */
    public function directory(PublicAgencyFilters $filters): array
    {
        $page = $this->agencies->paginateRanked($filters, PublicAgencyRules::AGENCIES_PER_PAGE);
        $this->mark($page->getCollection(), $this->topHirerIds($filters->pathway));

        return ['agencies' => $page, 'counts' => $this->agencies->countsByPathway($filters)];
    }

    /** The agency block on a job profile, with its Top Hirer flag. */
    public function listedBy(int $agencyId): ?Agency
    {
        $agency = $this->agencies->findPublicById($agencyId);
        if ($agency === null) {
            return null;
        }
        $this->mark(collect([$agency]), $this->topHirerIds($agency->pathway));

        return $agency;
    }

    /**
     * @return null|array{
     *     agency: Agency,
     *     ratingSummary: array{average: float|null, total: int, distribution: array<int, int>},
     *     reviews: LengthAwarePaginator<int, AgencyReview>
     * }
     */
    public function profile(string $slug, int $reviewsPage): ?array
    {
        $agency = $this->agencies->findPublicBySlug($slug);
        if ($agency === null) {
            return null;
        }
        $this->mark(collect([$agency]), $this->topHirerIds($agency->pathway));
        $distribution = $this->agencies->ratingDistribution($agency->id);
        $total = array_sum($distribution);
        $weighted = 0;
        foreach ($distribution as $star => $count) {
            $weighted += $star * $count;
        }

        return [
            'agency' => $agency,
            'ratingSummary' => ['average' => $total === 0 ? null : round($weighted / $total, 1), 'total' => $total, 'distribution' => $distribution],
            'reviews' => $this->agencies->paginateReviews($agency->id, PublicAgencyRules::REVIEWS_PER_PAGE, $reviewsPage),
        ];
    }

    /** @return list<int> */
    public function topHirerIds(Pathway $pathway): array
    {
        return $this->flaggedIds($this->agencies->topRanked($pathway, PublicAgencyRules::TOP_HIRER_RANK_LIMIT));
    }

    /**
     * @param  Collection<int, Agency>  $ranked  the head of a pathway ranking
     * @return list<int>
     */
    private function flaggedIds(Collection $ranked): array
    {
        return array_values($ranked->take(PublicAgencyRules::TOP_HIRER_RANK_LIMIT)
            ->filter(fn (Agency $agency): bool => (int) $agency->getAttribute('hired_count') >= 1)
            ->map(fn (Agency $agency): int => $agency->id)->all());
    }

    /**
     * @template TCollection of Collection<int, Agency>
     *
     * @param  TCollection  $agencies
     * @param  list<int>  $topHirerIds
     * @return TCollection
     */
    private function mark(Collection $agencies, array $topHirerIds): Collection
    {
        $agencies->each(fn (Agency $agency) => $agency->setAttribute('is_top_hirer', in_array($agency->id, $topHirerIds, true)));

        return $agencies;
    }
}
