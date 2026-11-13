<?php

namespace App\Repositories\JobPost;

use App\Enums\ApplicationStage;
use App\Enums\JobPostDisplayStatus;
use App\Enums\JobPostSort;
use App\Enums\JobPostStatus;
use App\Enums\Pathway;
use App\Enums\RecruitmentType;
use App\Models\Application;
use App\Models\Employer;
use App\Models\JobCategory;
use App\Models\JobPost;
use App\Models\JobPostLanguage;
use App\Models\JobPostQuestion;
use App\Models\JobSubcategory;
use App\Models\User;
use App\Support\JobPostIndexFilters;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

/**
 * @phpstan-import-type LanguageData from \App\Data\JobPost\StoreJobPostData
 * @phpstan-import-type QuestionData from \App\Data\JobPost\StoreJobPostData
 */
class JobPostRepository
{
    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): JobPost
    {
        return JobPost::query()->create($attributes);
    }

    public function findVisibleForUpdate(User $user, int $id): JobPost
    {
        return JobPost::query()->visibleTo($user)->lockForUpdate()->findOrFail($id);
    }

    /** @param array<string, mixed> $attributes */
    public function update(JobPost $post, array $attributes): void
    {
        $post->update($attributes);
    }

    /** @return array<string, mixed> */
    public function formValues(JobPost $post): array
    {
        $post->load(['languages', 'questions' => fn ($query) => $query->orderBy('sort_order')->orderBy('id')]);

        return [
            ...$post->only(['id', ...(new JobPost)->getFillable()]),
            'closing_date' => $post->closing_date?->toDateString(),
            'languages' => $post->languages->map(fn (JobPostLanguage $language): array => $language->only(['language', 'proficiency']))->all(),
            'questions' => $post->questions->map(fn (JobPostQuestion $question): array => $question->only(['id', 'question_text', 'answer_type', 'expected_answer', 'options', 'is_required']))->all(),
        ];
    }

    /** @param list<QuestionData> $questions */
    public function syncQuestions(JobPost $post, array $questions): void
    {
        $ids = [];
        foreach ($questions as $index => $question) {
            $attributes = $question;
            unset($attributes['id']);
            $attributes['sort_order'] = $index;
            if (isset($question['id'])) {
                $existing = $post->questions()->findOrFail($question['id']);
                $existing->update($attributes);
                $ids[] = $existing->id;
            } else {
                $ids[] = $post->questions()->create($attributes)->id;
            }
        }

        $post->questions()->whereNotIn('id', $ids)->whereDoesntHave('answers')->delete();
    }

    /** @param list<LanguageData> $languages */
    public function syncLanguages(JobPost $post, array $languages): void
    {
        $post->languages()->delete();
        if ($languages !== []) {
            JobPostLanguage::query()->insert(array_map(fn (array $language): array => ['job_post_id' => $post->id, ...$language], $languages));
        }
    }

    /** @param list<QuestionData> $questions */
    public function createQuestions(JobPost $post, array $questions): void
    {
        if ($questions === []) {
            return;
        }

        $now = now();
        $rows = [];
        foreach ($questions as $index => $question) {
            $rows[] = [...$question, 'options' => json_encode($question['options'], JSON_THROW_ON_ERROR), 'job_post_id' => $post->id, 'sort_order' => $index, 'created_at' => $now, 'updated_at' => $now];
        }
        JobPostQuestion::query()->insert($rows);
    }

    public function findSubcategoryWithCategory(int $id): ?JobSubcategory
    {
        return JobSubcategory::query()->with('category')->find($id);
    }

    public function findEmployerForAgency(int $id, int $agencyId): ?Employer
    {
        return Employer::query()->where('agency_id', $agencyId)->find($id);
    }

    /** @return list<array{id: int, name: string, subcategories: list<array{id: int, name: string}>}> */
    public function categoriesForPathway(Pathway $pathway): array
    {
        return array_values(JobCategory::query()->where('pathway', $pathway)->orderBy('sort_order')->orderBy('id')
            ->with(['subcategories' => fn ($query) => $query->orderBy('sort_order')->orderBy('id')])
            ->get()->map(fn (JobCategory $category): array => [
                'id' => $category->id, 'name' => $category->category_name,
                'subcategories' => array_values($category->subcategories->map(fn (JobSubcategory $subcategory): array => [
                    'id' => $subcategory->id, 'name' => $subcategory->subcategory_name,
                ])->all()),
            ])->all());
    }

    /** @return list<array{id: int, name: string, location: string, license_number: string}> */
    public function employersForAgency(int $agencyId): array
    {
        return array_values(Employer::query()->where('agency_id', $agencyId)->orderBy('employer_name')->orderBy('id')->get()
            ->map(fn (Employer $employer): array => [
                'id' => $employer->id, 'name' => $employer->employer_name,
                'location' => $employer->employer_location, 'license_number' => $employer->employer_license_number,
            ])->all());
    }

    /** @return list<array{id: int, job_title: string, created_at: ?string, display_status: string}> */
    public function findDuplicates(User $user, int $agencyId, ?int $employerId, string $normalizedTitle, int $subcategoryId, ?int $excludeId = null): array
    {
        if (DB::getDriverName() === 'pgsql') {
            $title = "LOWER(TRIM(REGEXP_REPLACE(job_title, '[[:space:]]+', ' ', 'g')))";
        } else {
            $title = "LOWER(TRIM(REPLACE(REPLACE(REPLACE(job_title, CHAR(9), ' '), CHAR(10), ' '), CHAR(13), ' ')))";
            // Eight passes collapse any whitespace run in a title of at most 255 characters.
            for ($pass = 0; $pass < 8; $pass++) {
                $title = "REPLACE({$title}, '  ', ' ')";
            }
        }

        return array_values(JobPost::query()->visibleTo($user)->forAgency($agencyId)
            ->when($excludeId !== null, fn (Builder $query) => $query->whereKeyNot($excludeId))
            ->where('employer_id', $employerId)->where('job_subcategory_id', $subcategoryId)
            ->whereRaw("{$title} = ?", [$normalizedTitle])->orderByDesc('id')->limit(5)
            ->get(['id', 'job_title', 'created_at', 'status', 'closing_date'])
            ->map(fn (JobPost $post): array => [
                'id' => $post->id, 'job_title' => $post->job_title,
                'created_at' => $post->created_at?->toISOString(), 'display_status' => $post->display_status->value,
            ])->all());
    }

    /** @return array{active_jobs: int, total_applicants: int, with_job_order: int, successful_placements: int} */
    public function kpisForUser(User $user): array
    {
        // KPIs describe the whole scope, never the table's filters. Expiry flips at midnight.
        $scope = JobPost::query()->visibleTo($user);
        $status = JobPost::displayStatusExpression();
        $posts = (clone $scope)->toBase()
            ->selectRaw("SUM(CASE WHEN ({$status['sql']}) = ? THEN 1 ELSE 0 END) AS active_jobs", [
                ...$status['bindings'], JobPostDisplayStatus::Active->value,
            ])
            ->selectRaw('SUM(CASE WHEN job_posts.status <> ? AND job_posts.recruitment_type = ? THEN 1 ELSE 0 END) AS with_job_order', [
                JobPostStatus::Archived->value, RecruitmentType::Joborder->value,
            ])->first();
        $applications = Application::query()->whereIn('job_post_id', $scope->select('job_posts.id'))->toBase()
            ->selectRaw('COUNT(*) AS total_applicants')
            ->selectRaw('SUM(CASE WHEN stage = ? THEN 1 ELSE 0 END) AS successful_placements', [ApplicationStage::Endorsed->value])
            ->first();

        return [
            'active_jobs' => (int) $posts->active_jobs, 'total_applicants' => (int) $applications->total_applicants,
            'with_job_order' => (int) $posts->with_job_order, 'successful_placements' => (int) $applications->successful_placements,
        ];
    }

    /** @return LengthAwarePaginator<int, JobPost> */
    public function paginateForUser(User $user, JobPostIndexFilters $filters): LengthAwarePaginator
    {
        $query = JobPost::query()->visibleTo($user)->select([
            'job_posts.id', 'job_posts.job_title', 'job_posts.work_location', 'job_posts.created_at',
            'job_posts.closing_date', 'job_posts.salary_currency', 'job_posts.monthly_salary_min',
            'job_posts.monthly_salary_max', 'job_posts.recruitment_type', 'job_posts.status', 'job_posts.is_urgent',
            'job_posts.vacant_positions',
        ])->withCount([
            'applications',
            'applications as hired_count' => fn (Builder $query) => $query->where('stage', ApplicationStage::Endorsed->value),
        ]);

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
