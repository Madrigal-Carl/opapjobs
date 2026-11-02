<?php

namespace App\Actions\Site;

use App\Models\JobPost;
use App\Models\User;
use App\Services\Site\ApplicantService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ShowMyJobsAction
{
    public function __construct(private ApplicantService $applicant) {}

    /** @return array{applied: Collection<int, JobPost>, saved: Collection<int, JobPost>, archived: Collection<int, JobPost>} */
    public function execute(User $applicant): array
    {
        return DB::transaction(fn (): array => $this->applicant->myJobs($applicant->id));
    }
}
