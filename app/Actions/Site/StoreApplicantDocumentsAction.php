<?php

namespace App\Actions\Site;

use App\Models\User;
use App\Services\Site\ApplicantService;
use Illuminate\Support\Facades\DB;

class StoreApplicantDocumentsAction
{
    public function __construct(private ApplicantService $applicant) {}

    /** @param list<array{original_file_name: string, storage_path: string, mime_type: ?string, file_size_bytes: int}> $files */
    public function execute(User $applicant, array $files): void
    {
        DB::transaction(fn () => $this->applicant->storeDocuments($applicant, $files));
    }
}
