<?php

namespace App\Actions\Site;

use App\Models\User;
use App\Services\Site\ApplicantService;
use Illuminate\Support\Facades\DB;

class UpdateApplicantAvatarAction
{
    public function __construct(private ApplicantService $applicant) {}

    /** Returns the previous photo's path, for the caller to delete once saved. */
    public function execute(User $applicant, string $path): ?string
    {
        return DB::transaction(fn (): ?string => $this->applicant->updateAvatar($applicant, $path));
    }
}
