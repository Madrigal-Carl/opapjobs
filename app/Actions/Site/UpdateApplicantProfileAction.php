<?php

namespace App\Actions\Site;

use App\Models\User;
use App\Services\Site\ApplicantService;
use Illuminate\Support\Facades\DB;

/** @phpstan-import-type ProfileData from \App\Http\Requests\Site\UpdateApplicantProfileRequest */
class UpdateApplicantProfileAction
{
    public function __construct(private ApplicantService $applicant) {}

    /** @param ProfileData $data */
    public function execute(User $applicant, array $data): void
    {
        DB::transaction(fn () => $this->applicant->updateProfile($applicant, $data));
    }
}
