<?php

namespace App\Services\Site;

use App\Enums\Pathway;
use App\Models\Agency;
use App\Models\JobPost;
use App\Repositories\Site\PublicJobPostRepository;
use App\Support\PublicAgencyRules;
use App\Support\PublicJobPostFilters;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class PublicJobPostService
{
    public function __construct(private PublicJobPostRepository $posts, private PublicAgencyService $agencies) {}

    /** @return array{jobs: array<string, Collection<int, JobPost>>, activeCounts: array{landbased: int, seabased: int}} */
    public function home(): array
    {
        $jobs = [];
        foreach (Pathway::cases() as $pathway) {
            $jobs[$pathway->value] = $this->posts->latest($pathway, PublicAgencyRules::HOME_JOBS_PER_PATHWAY);
        }

        return ['jobs' => $jobs, 'activeCounts' => $this->posts->activeCountsByPathway()];
    }

    /** @return array{posts: LengthAwarePaginator<int, JobPost>} */
    public function browse(PublicJobPostFilters $filters): array
    {
        return ['posts' => $this->posts->paginate($filters, PublicAgencyRules::JOBS_PER_BATCH)];
    }

    /**
     * A job post with its agency block and the job posts shown beside it, or
     * `null` when the public may not see it. Only route ids made of digits
     * can match; anything else is simply not found.
     *
     * @return null|array{post: JobPost, agency: Agency, otherJobs: Collection<int, JobPost>, relatedJobs: Collection<int, JobPost>}
     */
    public function show(string $id, ?int $userId): ?array
    {
        if (! ctype_digit($id) || strlen($id) > 18) {
            return null;
        }

        $post = $this->posts->findVisible((int) $id, $userId);
        $agency = $post === null ? null : $this->agencies->listedBy($post->agency_id);
        if ($post === null || $agency === null) {
            return null;
        }

        $otherJobs = $this->posts->activeForAgency($agency->id, PublicAgencyRules::OTHER_JOBS_FROM_AGENCY_LIMIT, $post->id);
        $categoryId = $post->subcategory?->job_category_id;
        $relatedJobs = $otherJobs->count() < PublicAgencyRules::RELATED_JOBS_LIMIT && $categoryId !== null
            ? $this->posts->related($agency->pathway->value, $categoryId, $agency->id, PublicAgencyRules::RELATED_JOBS_LIMIT)
            : new Collection;

        return ['post' => $post, 'agency' => $agency, 'otherJobs' => $otherJobs, 'relatedJobs' => $relatedJobs];
    }

    /** @return Collection<int, JobPost> */
    public function forAgency(int $agencyId): Collection
    {
        return $this->posts->activeForAgency($agencyId, PublicAgencyRules::AGENCY_PROFILE_JOBS_LIMIT);
    }
}
