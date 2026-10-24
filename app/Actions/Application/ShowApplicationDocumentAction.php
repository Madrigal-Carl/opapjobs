<?php

namespace App\Actions\Application;

use App\Models\ApplicantDocument;
use App\Models\User;
use App\Services\Application\ApplicationService;
use Illuminate\Support\Facades\DB;

class ShowApplicationDocumentAction
{
    public function __construct(private ApplicationService $service) {}

    public function execute(User $user, int $application, int $document): ApplicantDocument
    {
        return DB::transaction(fn (): ApplicantDocument => $this->service->document($user, $application, $document));
    }
}
