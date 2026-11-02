<?php

namespace App\Actions\Site;

use App\Models\JobPost;
use App\Models\JobPostQuestion;
use App\Models\User;
use App\Services\Site\ApplicantService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ShowJobApplicationAction
{
    public function __construct(private ApplicantService $applicant) {}

    /** @return null|array{post: JobPost, questions: Collection<int, JobPostQuestion>, applicant: User|null} */
    public function execute(string $jobPostId, User $applicant): ?array
    {
        return DB::transaction(fn (): ?array => $this->applicant->application($jobPostId, $applicant->id));
    }
}
