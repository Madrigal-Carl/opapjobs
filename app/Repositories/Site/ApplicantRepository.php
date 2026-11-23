<?php

namespace App\Repositories\Site;

use App\Models\ApplicantDocument;
use App\Models\Application;
use App\Models\JobPost;
use App\Models\JobPostQuestion;
use App\Models\SavedJobPost;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

/**
 * The signed-in applicant's own rows: what they applied to, saved or
 * archived, their profile and files, and the questions a job post asks them.
 */
class ApplicantRepository
{
    public function lockJob(int $jobId): void
    {
        JobPost::query()->whereKey($jobId)->lockForUpdate()->firstOrFail();
    }

    public function hasApplication(int $userId, int $jobId): bool
    {
        return Application::query()->where('applicant_user_id', $userId)->where('job_post_id', $jobId)->exists();
    }

    /** One of the applicant's own files that has not been removed, optionally only of one MIME type. */
    public function ownDocument(int $userId, int $documentId, ?string $mimeType = null): ?ApplicantDocument
    {
        return ApplicantDocument::query()->whereKey($documentId)->where('applicant_user_id', $userId)
            ->when($mimeType !== null, fn ($query) => $query->where('mime_type', $mimeType))
            ->lockForUpdate()->first();
    }

    public function documentCount(int $userId): int
    {
        return ApplicantDocument::query()->where('applicant_user_id', $userId)->count();
    }

    /**
     * Writes the profile row and replaces every section list, keeping the
     * order the applicant sees.
     *
     * @param  array<string, mixed>  $profile
     * @param  array{experiences: list<array<string, mixed>>, education: list<array<string, mixed>>, certifications: list<array<string, mixed>>, skills: list<array<string, mixed>>}  $sections
     */
    public function saveProfile(User $user, string $name, array $profile, array $sections): void
    {
        $user->update(['name' => $name]);
        $user->applicantProfile()->updateOrCreate([], $profile);

        foreach ($sections as $relation => $rows) {
            $user->{$relation}()->delete();
            $user->{$relation}()->createMany(array_map(
                fn (array $row, int $index): array => [...$row, 'sort_order' => $index],
                $rows, array_keys($rows),
            ));
        }
    }

    public function setAvatarPath(User $user, string $path): ?string
    {
        $profile = $user->applicantProfile()->firstOrCreate([]);
        $previous = $profile->avatar_path;
        $profile->update(['avatar_path' => $path]);

        return $previous;
    }

    public function save(int $userId, int $jobId): void
    {
        SavedJobPost::query()->insertOrIgnore(['applicant_user_id' => $userId, 'job_post_id' => $jobId, 'created_at' => now()]);
    }

    public function unsave(int $userId, int $jobId): void
    {
        SavedJobPost::query()->where('applicant_user_id', $userId)->where('job_post_id', $jobId)->delete();
    }

    /** @param array{job_post_id: int, applicant_user_id: int, resume_document_id: int, cover_letter: ?string, stage: string, submitted_at: CarbonImmutable} $attributes */
    public function createApplication(array $attributes): Application
    {
        return Application::query()->create($attributes);
    }

    /** @param list<array{job_post_question_id: int, answer_text: string}> $answers */
    public function createAnswers(Application $application, array $answers): void
    {
        $application->answers()->createMany($answers);
    }

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

    /** The applicant with their profile and every profile section, in display order. */
    public function profile(int $userId): ?User
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
            ->with('options')
            ->orderBy('sort_order')->orderBy('id')
            ->get();
    }
}
