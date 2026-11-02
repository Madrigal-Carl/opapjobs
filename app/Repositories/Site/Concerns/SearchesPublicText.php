<?php

namespace App\Repositories\Site\Concerns;

use App\Models\Agency;
use App\Models\JobPost;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Case-insensitive "contains" search that works on PostgreSQL and SQLite,
 * plus the SQL form of a job post's public location. Keeping the driver
 * branching here is the only place it exists.
 */
trait SearchesPublicText
{
    /** `LOWER(expr) LIKE '%term%'`, with `%`, `_` and `\` in the term matched literally. */
    protected function likePattern(string $term): string
    {
        return '%'.addcslashes(mb_strtolower($term), '\\%_').'%';
    }

    /**
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @param  literal-string  $expression
     */
    protected function orWhereContains(Builder $query, string $expression, string $pattern): void
    {
        $query->orWhereRaw("LOWER({$expression}) LIKE ? ESCAPE '\\'", [$pattern]);
    }

    /**
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @param  literal-string  $expression
     */
    protected function whereContains(Builder $query, string $expression, string $pattern): void
    {
        $query->whereRaw("LOWER({$expression}) LIKE ? ESCAPE '\\'", [$pattern]);
    }

    /**
     * What an applicant may read as the job post's location: the full
     * `work_location` for job orders, only its trailing part (the country)
     * for manpooling. Matches `PublicDisplay::destination()`.
     *
     * @return literal-string
     */
    protected function publicLocationSql(): string
    {
        $trailing = DB::getDriverName() === 'pgsql'
            ? "TRIM(REGEXP_REPLACE(job_posts.work_location, '^.*,', ''))"
            : "TRIM(SUBSTR(job_posts.work_location, LENGTH(RTRIM(job_posts.work_location, REPLACE(job_posts.work_location, ',', ''))) + 1))";

        return "(CASE WHEN job_posts.recruitment_type = 'manpooling' THEN {$trailing} ELSE job_posts.work_location END)";
    }

    /**
     * Ids of agencies the public may see: not archived and not suspended.
     * Verification is a badge, not a gate.
     *
     * @return Builder<Agency>
     */
    protected function publicAgencyIds(?string $pathway = null): Builder
    {
        return Agency::query()->whereNull('agencies.suspended_at')
            ->when($pathway !== null, fn (Builder $query) => $query->where('agencies.pathway', $pathway))
            ->select('agencies.id');
    }

    /**
     * Job posts whose display status is `active` and whose Agency is public.
     *
     * @return Builder<JobPost>
     */
    protected function publicJobPosts(): Builder
    {
        return JobPost::query()->active()->whereIn('job_posts.agency_id', $this->publicAgencyIds());
    }
}
