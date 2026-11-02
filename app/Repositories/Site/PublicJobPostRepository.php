<?php

namespace App\Repositories\Site;

use App\Enums\JobPostStatus;
use App\Enums\Pathway;
use App\Enums\RecruitmentType;
use App\Models\JobPost;
use App\Repositories\Site\Concerns\SearchesPublicText;
use App\Support\PublicAgencyRules;
use App\Support\PublicJobPostFilters;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Reads for job posts the public may see. Every query starts from
 * `publicJobPosts()` (display status `active`, Agency public) except the
 * single-post lookup, which also lets an applicant reopen a closed or expired
 * post they applied to.
 */
class PublicJobPostRepository
{
    use SearchesPublicText;

    private const CARD_COLUMNS = [
        'job_posts.id', 'job_posts.agency_id', 'job_posts.employer_id', 'job_posts.job_subcategory_id',
        'job_posts.recruitment_type', 'job_posts.job_title', 'job_posts.work_location', 'job_posts.vacant_positions',
        'job_posts.salary_currency', 'job_posts.monthly_salary_min', 'job_posts.monthly_salary_max',
        'job_posts.status', 'job_posts.closing_date', 'job_posts.is_urgent', 'job_posts.created_at',
    ];

    private const PREVIEW_COLUMNS = [
        'job_posts.contract_type', 'job_posts.education_level', 'job_posts.min_experience_years',
        'job_posts.max_experience_years', 'job_posts.gender_requirement', 'job_posts.job_description',
        'job_posts.other_requirements', 'job_posts.application_instructions',
    ];

    private const DETAIL_COLUMNS = [
        'job_posts.job_order_number', 'job_posts.contact_person_name', 'job_posts.contact_email', 'job_posts.contact_phone',
    ];

    /** @return Collection<int, JobPost> */
    public function latest(Pathway $pathway, int $limit): Collection
    {
        return $this->cards($this->publicJobPosts()->whereIn('job_posts.agency_id', $this->publicAgencyIds($pathway->value)))
            ->limit($limit)->get();
    }

    /** @return array{landbased: int, seabased: int} */
    public function activeCountsByPathway(): array
    {
        $counts = $this->publicJobPosts()->toBase()
            ->join('agencies as public_agencies', 'public_agencies.id', '=', 'job_posts.agency_id')
            ->selectRaw('public_agencies.pathway AS pathway, COUNT(*) AS total')
            ->groupBy('public_agencies.pathway')->pluck('total', 'pathway');

        return ['landbased' => (int) ($counts['landbased'] ?? 0), 'seabased' => (int) ($counts['seabased'] ?? 0)];
    }

    /** @return LengthAwarePaginator<int, JobPost> */
    public function paginate(PublicJobPostFilters $filters, int $perPage): LengthAwarePaginator
    {
        $query = $this->searched($filters);

        foreach (['landbased', 'seabased'] as $pathway) {
            if ($filters->has($pathway)) {
                $query->whereIn('job_posts.agency_id', $this->publicAgencyIds($pathway));
            }
        }
        if ($filters->has('urgent')) {
            $query->where('job_posts.is_urgent', true);
        }
        if ($filters->has('recent')) {
            $query->where('job_posts.created_at', '>=', $this->recentSince());
        }

        return $this->cards($query, self::PREVIEW_COLUMNS)->with('languages:job_post_id,language,proficiency')
            ->paginate($perPage, page: $filters->page);
    }

    /**
     * An active job post of a public Agency, or a closed / expired one the
     * given applicant has applied to. Archived job posts never resolve.
     */
    public function findVisible(int $id, ?int $applicantUserId): ?JobPost
    {
        return JobPost::query()->whereKey($id)
            ->whereIn('job_posts.agency_id', $this->publicAgencyIds())
            ->where(function (Builder $visible) use ($applicantUserId): void {
                $visible->where(fn (Builder $active) => $active->active());
                if ($applicantUserId !== null) {
                    $visible->orWhere(fn (Builder $applied) => $applied
                        ->where('job_posts.status', '!=', JobPostStatus::Archived->value)
                        ->whereHas('applications', fn (Builder $applications) => $applications->where('applicant_user_id', $applicantUserId)));
                }
            })
            ->select([...self::CARD_COLUMNS, ...self::PREVIEW_COLUMNS, ...self::DETAIL_COLUMNS])
            ->with([
                'agency:id,slug,agency_name,pathway',
                'subcategory:id,job_category_id,subcategory_name', 'subcategory.category:id,category_name',
                'employer:id,employer_name,employer_location,employer_license_number',
                'languages:job_post_id,language,proficiency',
            ])
            ->first();
    }

    /** @return Collection<int, JobPost> */
    public function activeForAgency(int $agencyId, int $limit, ?int $excludeId = null): Collection
    {
        return $this->cards($this->publicJobPosts()->where('job_posts.agency_id', $agencyId)
            ->when($excludeId !== null, fn (Builder $query) => $query->whereKeyNot($excludeId)))
            ->limit($limit)->get();
    }

    /**
     * Job posts the applicant applied to, newest application first. Closed
     * and expired ones stay (it is their history); archived job posts and
     * hidden agencies drop out, as they do on the job profile.
     *
     * @return Collection<int, JobPost>
     */
    public function appliedBy(int $applicantUserId, bool $archived): Collection
    {
        $query = JobPost::query()
            ->join('applications', 'applications.job_post_id', '=', 'job_posts.id')
            ->where('applications.applicant_user_id', $applicantUserId)
            ->when($archived,
                fn (Builder $query) => $query->whereNotNull('applications.applicant_archived_at'),
                fn (Builder $query) => $query->whereNull('applications.applicant_archived_at'));

        return $this->cards($this->visibleToApplicant($query), [
            'applications.stage as application_stage', 'applications.submitted_at as application_submitted_at',
        ])->reorder()->orderByDesc('applications.submitted_at')->orderByDesc('job_posts.id')->get();
    }

    /**
     * Job posts the applicant bookmarked, most recently saved first.
     *
     * @return Collection<int, JobPost>
     */
    public function savedBy(int $applicantUserId): Collection
    {
        $query = JobPost::query()
            ->join('saved_job_posts', 'saved_job_posts.job_post_id', '=', 'job_posts.id')
            ->where('saved_job_posts.applicant_user_id', $applicantUserId);

        return $this->cards($this->visibleToApplicant($query), ['saved_job_posts.created_at as saved_at'])
            ->reorder()->orderByDesc('saved_job_posts.created_at')->orderByDesc('job_posts.id')->get();
    }

    /**
     * Same pathway and category, from other agencies.
     *
     * @return Collection<int, JobPost>
     */
    public function related(string $pathway, int $categoryId, int $excludeAgencyId, int $limit): Collection
    {
        return $this->cards($this->publicJobPosts()
            ->whereIn('job_posts.agency_id', $this->publicAgencyIds($pathway))
            ->where('job_posts.agency_id', '!=', $excludeAgencyId)
            ->whereHas('subcategory', fn (Builder $subcategory) => $subcategory->where('job_category_id', $categoryId)))
            ->limit($limit)->get();
    }

    /**
     * Keyword and country, matched only against what an applicant can read:
     * a manpooling employer name is never searchable, and its location is
     * searched by country only.
     *
     * @return Builder<JobPost>
     */
    private function searched(PublicJobPostFilters $filters): Builder
    {
        $query = $this->publicJobPosts();
        $location = $this->publicLocationSql();

        if ($filters->q !== null) {
            $pattern = $this->likePattern($filters->q);
            $query->where(function (Builder $search) use ($pattern, $location): void {
                $this->orWhereContains($search, 'job_posts.job_title', $pattern);
                $this->orWhereContains($search, $location, $pattern);
                $search->orWhereHas('subcategory', fn (Builder $subcategory) => $this->whereContains($subcategory, 'job_subcategories.subcategory_name', $pattern))
                    ->orWhereHas('subcategory.category', fn (Builder $category) => $this->whereContains($category, 'job_categories.category_name', $pattern))
                    ->orWhereHas('agency', fn (Builder $agency) => $this->whereContains($agency, 'agencies.agency_name', $pattern))
                    ->orWhere(fn (Builder $named) => $named
                        ->where('job_posts.recruitment_type', RecruitmentType::Joborder->value)
                        ->whereHas('employer', fn (Builder $employer) => $this->whereContains($employer, 'employers.employer_name', $pattern)));
            });
        }

        if ($filters->country !== null) {
            $this->whereContains($query, $location, $this->likePattern($filters->country));
        }

        return $query;
    }

    /**
     * @param  Builder<JobPost>  $query
     * @param  list<string>  $extraColumns
     * @return Builder<JobPost>
     */
    private function cards(Builder $query, array $extraColumns = []): Builder
    {
        return $query->select([...self::CARD_COLUMNS, ...$extraColumns])
            ->with([
                'agency:id,slug,agency_name,pathway',
                'subcategory:id,job_category_id,subcategory_name', 'subcategory.category:id,category_name',
                'employer:id,employer_name',
            ])
            ->orderByDesc('job_posts.created_at')->orderByDesc('job_posts.id');
    }

    /**
     * @param  Builder<JobPost>  $query
     * @return Builder<JobPost>
     */
    private function visibleToApplicant(Builder $query): Builder
    {
        return $query->whereIn('job_posts.agency_id', $this->publicAgencyIds())
            ->where('job_posts.status', '!=', JobPostStatus::Archived->value);
    }

    private function recentSince(): CarbonInterface
    {
        return now()->subDays(PublicAgencyRules::RECENT_DAYS);
    }
}
