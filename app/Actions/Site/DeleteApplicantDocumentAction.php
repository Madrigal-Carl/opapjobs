<?php

namespace App\Actions\Site;

use App\Models\User;
use App\Services\Site\ApplicantService;
use Illuminate\Support\Facades\DB;

class DeleteApplicantDocumentAction
{
    public function __construct(private ApplicantService $applicant) {}

    /** Returns the file's path when nothing else uses it, for the caller to delete once saved. */
    public function execute(User $applicant, int $documentId): ?string
    {
        return DB::transaction(fn (): ?string => $this->applicant->deleteDocument($applicant, $documentId));
    }
}
