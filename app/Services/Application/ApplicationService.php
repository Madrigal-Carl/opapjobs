<?php

namespace App\Services\Application;

use App\Enums\ApplicationStage;
use App\Exceptions\Application\IllegalApplicationTransitionException;
use App\Models\ApplicantDocument;
use App\Models\Application;
use App\Models\ApplicationStageHistory;
use App\Models\User;
use App\Repositories\Application\ApplicationRepository;
use App\Repositories\AuditLogRepository;
use App\Support\ApplicationIndexFilters;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Pagination\LengthAwarePaginator;

class ApplicationService
{
    public function __construct(
        private ApplicationRepository $applications,
        private AuditLogRepository $audit,
    ) {}

    /** @return array{applications: ?LengthAwarePaginator<int, Application>, kpis: ?array{total_applicants: int, new_today: int, reviewed: int, shortlisted: int}} */
    public function list(User $user, ApplicationIndexFilters $filters, bool $includeApplications, bool $includeKpis): array
    {
        return [
            'applications' => $includeApplications ? $this->applications->paginateForUser($user, $filters) : null,
            'kpis' => $includeKpis ? $this->applications->kpisForUser($user) : null,
        ];
    }

    public function show(User $user, int $id): Application
    {
        return $this->applications->findVisibleOrFail($user, $id);
    }

    public function proceed(User $user, int $id, string $ipAddress): ApplicationStage
    {
        $application = $this->applications->findVisibleForUpdate($user, $id);
        $next = $application->stage->next();

        if ($next === null) {
            throw IllegalApplicationTransitionException::terminal($application->stage);
        }

        return $this->transition($application, $user, $next, null, $ipAddress);
    }

    public function reject(User $user, int $id, string $ipAddress, ?string $note): ApplicationStage
    {
        $application = $this->applications->findVisibleForUpdate($user, $id);

        if ($application->stage->isTerminal()) {
            throw IllegalApplicationTransitionException::terminal($application->stage);
        }

        return $this->transition($application, $user, ApplicationStage::Rejected, $note, $ipAddress);
    }

    public function document(User $user, int $id, int $documentId): ApplicantDocument
    {
        $application = $this->applications->findVisibleOrFail($user, $id);
        $document = $this->applications->findVisibleDocument($application, $documentId);

        if ($document === null) {
            throw (new ModelNotFoundException)->setModel(ApplicantDocument::class, [$documentId]);
        }

        return $document;
    }

    private function transition(Application $application, User $user, ApplicationStage $to, ?string $note, string $ipAddress): ApplicationStage
    {
        $from = $application->stage;

        $application->update(['stage' => $to]);
        ApplicationStageHistory::create([
            'application_id' => $application->id,
            'from_stage' => $from,
            'to_stage' => $to,
            'changed_by_user_id' => $user->id,
            'note' => $note,
            'created_at' => now(),
        ]);
        $this->audit->recordApplicationStageChange($application, $user, $from, $to, $ipAddress);

        return $to;
    }
}
