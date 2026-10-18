<?php

namespace App\Queries;

use App\Enums\JobPostDisplayStatus;
use App\Enums\JobPostSort;
use App\Models\JobPost;
use App\Models\User;
use App\Support\JobPostIndexFilters;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class JobPostIndexQuery
{
    /** @return LengthAwarePaginator<int, JobPost> */
    public function paginate(User $user, JobPostIndexFilters $filters): LengthAwarePaginator
    {
        $query = JobPost::query()->visibleTo($user)->select([
            'job_posts.id', 'job_posts.job_title', 'job_posts.work_location', 'job_posts.created_at',
            'job_posts.closing_date', 'job_posts.salary_currency', 'job_posts.monthly_salary_min',
            'job_posts.monthly_salary_max', 'job_posts.recruitment_type', 'job_posts.status', 'job_posts.is_urgent',
        ])->withCount('applications');

        if ($filters->status === null) {
            $query->notArchived();
        } else {
            $query->whereDisplayStatus($filters->status);
        }

        if ($filters->recruitmentType !== null) {
            $query->where('job_posts.recruitment_type', $filters->recruitmentType);
        }

        if ($filters->q !== null) {
            $pattern = '%'.addcslashes($filters->q, '%_\\').'%';
            $query->where(function (Builder $search) use ($pattern): void {
                $search->where(fn (Builder $titles) => $this->searchColumn($titles, 'job_posts.job_title', $pattern))
                    ->orWhere(fn (Builder $locations) => $this->searchColumn($locations, 'job_posts.work_location', $pattern))
                    ->orWhereHas('employer', fn (Builder $employers) => $this->searchColumn($employers, 'employers.employer_name', $pattern))
                    ->orWhereHas('subcategory', fn (Builder $subcategories) => $this->searchColumn($subcategories, 'job_subcategories.subcategory_name', $pattern))
                    ->orWhereHas('category', fn (Builder $categories) => $this->searchColumn($categories, 'job_categories.category_name', $pattern));
            });
        }

        match ($filters->sort) {
            JobPostSort::Newest => $query->orderByDesc('job_posts.created_at'),
            JobPostSort::Oldest => $query->orderBy('job_posts.created_at'),
            JobPostSort::Applicants => $query->orderByDesc('applications_count'),
            JobPostSort::Expiring => $this->orderByExpiry($query),
            JobPostSort::Salary => $this->orderBySalary($query),
        };
        $query->orderByDesc('job_posts.id');

        $results = $query->paginate($filters->perPage, page: $filters->page)->withQueryString();

        if ($results->currentPage() > $results->lastPage()) {
            $results = $query->paginate($filters->perPage, page: $results->lastPage(), total: $results->total())->withQueryString();
        }

        return $results;
    }

    /**
     * @param  Builder<covariant Model>  $query
     * @param  literal-string  $column
     */
    private function searchColumn(Builder $query, string $column, string $pattern): void
    {
        // SQLite has no default LIKE escape character, and whereLike cannot accept an ESCAPE clause.
        if (DB::getDriverName() === 'sqlite') {
            $query->whereRaw("{$column} LIKE ? ESCAPE '\\'", [$pattern]);

            return;
        }

        $query->whereLike($column, $pattern, caseSensitive: false);
    }

    /** @param Builder<JobPost> $query */
    private function orderByExpiry(Builder $query): void
    {
        $status = JobPost::displayStatusExpression();
        $eligible = "({$status['sql']}) = ? AND job_posts.closing_date IS NOT NULL";
        $bindings = [...$status['bindings'], JobPostDisplayStatus::Active->value];
        $query->orderByRaw("CASE WHEN {$eligible} THEN 0 ELSE 1 END", $bindings)
            ->orderByRaw("CASE WHEN {$eligible} THEN job_posts.closing_date ELSE NULL END ASC", $bindings);
    }

    /** @param Builder<JobPost> $query */
    private function orderBySalary(Builder $query): void
    {
        // Currencies are not normalized; this is a rough ordering, not a converted salary comparison.
        $query->orderByRaw('CASE WHEN job_posts.monthly_salary_min IS NULL THEN 1 ELSE 0 END')
            ->orderByDesc('job_posts.monthly_salary_min');
    }
}
