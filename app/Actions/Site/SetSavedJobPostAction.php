<?php

namespace App\Actions\Site;

use App\Models\User;
use App\Services\Site\ApplicantService;
use Illuminate\Support\Facades\DB;

class SetSavedJobPostAction
{
    public function __construct(private ApplicantService $applicant) {}

    public function execute(User $applicant, int $jobId, bool $saved): void
    {
        DB::transaction(fn () => $this->applicant->setSaved($applicant, $jobId, $saved));
    }
}
