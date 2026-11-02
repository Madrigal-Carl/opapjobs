<?php

namespace App\Repositories\Site;

use App\Models\Application;
use App\Models\JobPostQuestion;
use App\Models\SavedJobPost;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

/**
 * Reads of the signed-in applicant's own rows: what they applied to, saved
 * or archived, their resume, and the questions a job post asks them.
 */
class ApplicantRepository
{
    /**
     * Job post ids by My Jobs tab. An archived application (the applicant's
     * own `applicant_archived_at`) leaves the Applied tab for Archived.
     *
     * @return array{applied: list<int>, saved: list<int>, archived: list<int>}
     */
    public function activityIds(int $userId): array
    {
        $applications = Application::query()->toBase()
            ->where('applicant_user_id', $userId)
            ->orderByDesc('submitted_at')->orderByDesc('id')
            ->get(['job_post_id', 'applicant_archived_at']);
        $saved = SavedJobPost::query()->toBase()
            ->where('applicant_user_id', $userId)
            ->orderByDesc('created_at')->orderByDesc('job_post_id')
            ->pluck('job_post_id');

        $ids = fn (iterable $values): array => array_values(array_map(fn (mixed $id): int => (int) $id, [...$values]));

        return [
            'applied' => $ids($applications->whereNull('applicant_archived_at')->pluck('job_post_id')),
            'saved' => $ids($saved),
            'archived' => $ids($applications->whereNotNull('applicant_archived_at')->pluck('job_post_id')),
        ];
    }

    /** The applicant with their profile and every resume section, in display order. */
    public function resume(int $userId): ?User
    {
        return User::query()->whereKey($userId)
            ->select(['id', 'name', 'email'])
            ->with([
                'applicantProfile',
                'experiences' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
                'education' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
                'certifications' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
                'skills' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
                // Archived (soft-deleted) files are kept for past applications, not offered again.
                'documents' => fn ($query) => $query->orderByDesc('is_primary')->orderByDesc('uploaded_at')->orderByDesc('id'),
            ])
            ->first();
    }

    /**
     * The questions an applicant answers, in order. The agency's
     * `expected_answer` is deliberately not selected.
     *
     * @return Collection<int, JobPostQuestion>
     */
    public function questions(int $jobPostId): Collection
    {
        return JobPostQuestion::query()
            ->where('job_post_id', $jobPostId)
            ->select(['id', 'job_post_id', 'question_text', 'answer_type', 'is_required', 'sort_order'])
            ->orderBy('sort_order')->orderBy('id')
            ->get();
    }
}
