<?php

namespace App\Services\Application;

use App\Enums\ApplicationStage;
use App\Enums\DataScope;
use App\Events\ApplicationStageChanged;
use App\Exceptions\Application\IllegalApplicationTransitionException;
use App\Models\ApplicantDocument;
use App\Models\Application;
use App\Models\ApplicationStageHistory;
use App\Models\User;
use App\Repositories\Application\ApplicationRepository;
use App\Repositories\AuditLogRepository;
use App\Support\ApplicationIndexFilters;
use App\Support\DataScopeResolver;
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

    /**
     * Moves a pending application to Reviewed when an eligible viewer opens it. Anything
     * else (another stage, an ineligible viewer, a repeated open) is a silent no-op.
     */
    public function autoReview(User $user, int $id, string $ipAddress): bool
    {
        $application = $this->applications->findVisibleForUpdate($user, $id);
        $application->loadMissing('jobPost.poster');

        if (! $this->canAutoReview($application, $user)) {
            return false;
        }

        $this->transition($application, $user, ApplicationStage::Reviewed, null, $ipAddress);

        return true;
    }

    public function reject(User $user, int $id, string $ipAddress, ?string $note): ApplicationStage
    {
        $application = $this->applications->findVisibleForUpdate($user, $id);

        if ($application->stage->isTerminal()) {
            throw IllegalApplicationTransitionException::terminal($application->stage);
        }

        return $this->transition($application, $user, ApplicationStage::NotSelected, $note, $ipAddress);
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

    /**
     * Only pending applications are auto-reviewed, and only by the job post's poster or,
     * when an Agency-role user posted it, by an admin (agency-scoped staff) of that same
     * agency. Posts by admins and superadmins are auto-reviewed by their poster alone.
     */
    private function canAutoReview(Application $application, User $user): bool
    {
        if ($application->stage !== ApplicationStage::Pending) {
            return false;
        }

        $post = $application->jobPost;

        if ($post->posted_by_user_id === $user->id) {
            return true;
        }

        return DataScopeResolver::for($user) === DataScope::Agency
            && $user->agency_id === $post->agency_id
            && $post->isPostedByAgencyStaff();
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
        ApplicationStageChanged::dispatch($application, $to);

        return $to;
    }
}
