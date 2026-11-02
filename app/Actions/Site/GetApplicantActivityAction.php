<?php

namespace App\Actions\Site;

use App\Models\User;
use App\Services\Site\ApplicantService;
use Illuminate\Support\Facades\DB;

class GetApplicantActivityAction
{
    public function __construct(private ApplicantService $applicant) {}

    /** @return array{applied: list<int>, saved: list<int>, archived: list<int>} */
    public function execute(User $applicant): array
    {
        return DB::transaction(fn (): array => $this->applicant->activity($applicant->id));
    }
}
