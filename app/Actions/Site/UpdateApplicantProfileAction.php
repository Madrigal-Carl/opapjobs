<?php

namespace App\Actions\Site;

use App\Models\User;
use App\Services\Site\ApplicantService;
use Illuminate\Support\Facades\DB;

class UpdateApplicantProfileAction
{
    public function __construct(private ApplicantService $applicant) {}

    /** @param array<string, mixed> $data Validated by UpdateApplicantProfileRequest. */
    public function execute(User $applicant, array $data): void
    {
        DB::transaction(fn () => $this->applicant->updateProfile($applicant, $data));
    }
}
