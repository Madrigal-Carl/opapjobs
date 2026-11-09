<?php

namespace App\Repositories\Application;

use App\Enums\ApplicationSort;
use App\Enums\ApplicationStage;
use App\Models\ApplicantDocument;
use App\Models\Application;
use App\Models\User;
use App\Support\ApplicationIndexFilters;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ApplicationRepository
{
    public function findVisibleOrFail(User $user, int $id): Application
    {
        return Application::query()->visibleTo($user)->with($this->detailRelations())->findOrFail($id);
    }

    public function findVisibleForUpdate(User $user, int $id): Application
    {
        return Application::query()->visibleTo($user)->lockForUpdate()->findOrFail($id);
    }

    public function findVisibleDocument(Application $application, int $documentId): ?ApplicantDocument
    {
        return $application->supportingDocuments->firstWhere('id', $documentId) ?? $application->applicant->documents
            ->first(fn (ApplicantDocument $document): bool => $document->id === $documentId
                && $document->uploaded_at->lessThanOrEqualTo($application->submitted_at));
    }

    /** @return array<int|string, mixed> */
    private function detailRelations(): array
    {
        return [
            'applicant.applicantProfile',
            'applicant.experiences' => fn ($query) => $query->orderBy('sort_order'),
            'applicant.education' => fn ($query) => $query->orderBy('sort_order'),
            'applicant.certifications' => fn ($query) => $query->orderBy('sort_order'),
            'applicant.skills' => fn ($query) => $query->orderBy('sort_order'),
            'applicant.documents' => fn ($query) => $query->whereDoesntHave('supportingApplications')->orderByDesc('is_primary')->orderBy('uploaded_at')->orderBy('id'),
            'supportingDocuments',
            'jobPost.employer',
            'jobPost.agency',
            'jobPost.subcategory.category',
            'jobPost.languages',
            'jobPost.questions' => fn ($query) => $query->withTrashed()->orderBy('sort_order'),
            'answers.question',
            'stageHistory' => fn ($query) => $query->orderBy('created_at')->orderBy('id'),
            'stageHistory.changedBy:id,name',
        ];
    }

    /** @return LengthAwarePaginator<int, Application> */
    public function paginateForUser(User $user, ApplicationIndexFilters $filters): LengthAwarePaginator
    {
        $query = Application::query()->visibleTo($user)
            ->with(['applicant:id,name', 'jobPost:id,job_title,employer_id', 'jobPost.employer:id,employer_name']);

        if ($filters->stage !== null) {
            $query->where('applications.stage', $filters->stage->value);
        }

        if ($filters->q !== null) {
            $pattern = '%'.addcslashes($filters->q, '%_\\').'%';
            $query->where(function (Builder $search) use ($pattern): void {
                $search->whereHas('applicant', fn (Builder $applicants) => $this->searchColumn($applicants, 'users.name', $pattern))
                    ->orWhereHas('jobPost', fn (Builder $posts) => $this->searchColumn($posts, 'job_posts.job_title', $pattern));
            });
        }

        match ($filters->sort) {
            ApplicationSort::Newest => $query->orderByDesc('applications.submitted_at'),
            ApplicationSort::Oldest => $query->orderBy('applications.submitted_at'),
        };
        $query->orderByDesc('applications.id');

        $results = $query->paginate($filters->perPage, page: $filters->page)->withQueryString();

        if ($results->currentPage() > $results->lastPage()) {
            $results = $query->paginate($filters->perPage, page: $results->lastPage(), total: $results->total())->withQueryString();
        }

        return $results;
    }

    /** @return array{total_applicants: int, new_today: int, reviewed: int, shortlisted: int} */
    public function kpisForUser(User $user): array
    {
        $today = now(config('app.timezone'));
        $applications = Application::query()->visibleTo($user)->toBase()
            ->selectRaw('COUNT(*) AS total_applicants')
            ->selectRaw('SUM(CASE WHEN submitted_at BETWEEN ? AND ? THEN 1 ELSE 0 END) AS new_today', [
                $today->copy()->startOfDay(), $today->copy()->endOfDay(),
            ])
            ->selectRaw('SUM(CASE WHEN stage = ? THEN 1 ELSE 0 END) AS reviewed', [ApplicationStage::Reviewed->value])
            ->selectRaw('SUM(CASE WHEN stage = ? THEN 1 ELSE 0 END) AS shortlisted', [ApplicationStage::Shortlisted->value])
            ->first();

        return [
            'total_applicants' => (int) $applications->total_applicants,
            'new_today' => (int) $applications->new_today,
            'reviewed' => (int) $applications->reviewed,
            'shortlisted' => (int) $applications->shortlisted,
        ];
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
}
