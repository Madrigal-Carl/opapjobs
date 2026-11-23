<?php

namespace App\Actions\Site;

use App\Models\User;
use App\Services\Site\ApplicantService;
use Illuminate\Support\Facades\DB;

class ShowApplicantProfileAction
{
    public function __construct(private ApplicantService $applicant) {}

    public function execute(User $applicant): ?User
    {
        return DB::transaction(fn (): ?User => $this->applicant->profile($applicant->id));
    }
}
