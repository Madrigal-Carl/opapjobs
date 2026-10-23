<?php

namespace App\Actions\Application;

use App\Models\Application;
use App\Models\User;
use App\Services\Application\ApplicationService;
use App\Support\ApplicationIndexFilters;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ListApplicationsAction
{
    public function __construct(private ApplicationService $service) {}

    /** @return array{applications: ?LengthAwarePaginator<int, Application>, kpis: ?array{total_applicants: int, new_today: int, reviewed: int, shortlisted: int}} */
    public function execute(User $user, ApplicationIndexFilters $filters, bool $includeApplications = true, bool $includeKpis = false): array
    {
        return DB::transaction(fn (): array => $this->service->list($user, $filters, $includeApplications, $includeKpis));
    }
}
