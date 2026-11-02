<?php

namespace App\Actions\Site;

use App\Models\User;
use App\Services\Site\ApplicantService;
use Illuminate\Support\Facades\DB;

class ShowApplicantResumeAction
{
    public function __construct(private ApplicantService $applicant) {}

    public function execute(User $applicant): ?User
    {
        return DB::transaction(fn (): ?User => $this->applicant->resume($applicant->id));
    }
}
