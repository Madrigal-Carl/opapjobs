<?php

namespace App\Services\Site;

use App\Models\JobPost;
use App\Models\JobPostQuestion;
use App\Models\User;
use App\Repositories\Site\ApplicantRepository;
use App\Repositories\Site\PublicJobPostRepository;
use Illuminate\Database\Eloquent\Collection;

/**
 * The signed-in applicant's side of the site, read from the database:
 * My Jobs, the resume, and the job post they are applying to. Nothing here
 * writes; saving, applying and resume edits are not persisted yet.
 */
class ApplicantService
{
    public function __construct(
        private ApplicantRepository $applicant,
        private PublicJobPostRepository $posts,
    ) {}

    /** @return array{applied: list<int>, saved: list<int>, archived: list<int>} */
    public function activity(int $userId): array
    {
        return $this->applicant->activityIds($userId);
    }

    /** @return array{applied: Collection<int, JobPost>, saved: Collection<int, JobPost>, archived: Collection<int, JobPost>} */
    public function myJobs(int $userId): array
    {
        return [
            'applied' => $this->posts->appliedBy($userId, archived: false),
            'saved' => $this->posts->savedBy($userId),
            'archived' => $this->posts->appliedBy($userId, archived: true),
        ];
    }

    public function resume(int $userId): ?User
    {
        return $this->applicant->resume($userId);
    }

    /**
     * The job post being applied to and its questions, or `null` when the
     * applicant may not see it (same rule as the job profile).
     *
     * @return null|array{post: JobPost, questions: Collection<int, JobPostQuestion>, applicant: User|null}
     */
    public function application(string $jobPostId, int $userId): ?array
    {
        if (! ctype_digit($jobPostId) || strlen($jobPostId) > 18) {
            return null;
        }

        $post = $this->posts->findVisible((int) $jobPostId, $userId);
        if ($post === null) {
            return null;
        }

        return [
            'post' => $post,
            'questions' => $this->applicant->questions($post->id),
            'applicant' => $this->applicant->resume($userId),
        ];
    }
}
