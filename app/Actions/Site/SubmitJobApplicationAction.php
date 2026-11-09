<?php

namespace App\Actions\Site;

use App\Models\Application;
use App\Models\User;
use App\Services\Site\ApplicantService;
use Illuminate\Support\Facades\DB;

class SubmitJobApplicationAction
{
    public function __construct(private ApplicantService $applicant) {}

    /** @param array{resume_document_id?: ?int, resume?: array{original_file_name: string, storage_path: string, mime_type: ?string, file_size_bytes: int}, cover_letter?: ?string, answers?: array<int, ?string>, documents?: list<array{name: string, file: array{original_file_name: string, storage_path: string, mime_type: ?string, file_size_bytes: int}}>} $data */
    public function execute(User $user, int $jobId, array $data): Application
    {
        return DB::transaction(fn (): Application => $this->applicant->submit($user, $jobId, $data));
    }
}
