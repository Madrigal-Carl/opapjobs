<?php

namespace App\Services\Application;

use App\Models\Application;
use App\Models\User;
use App\Repositories\Application\ApplicationRepository;
use App\Support\ApplicationIndexFilters;
use Illuminate\Pagination\LengthAwarePaginator;

class ApplicationService
{
    public function __construct(private ApplicationRepository $applications) {}

    /** @return array{applications: ?LengthAwarePaginator<int, Application>, kpis: ?array{total_applicants: int, new_today: int, reviewed: int, shortlisted: int}} */
    public function list(User $user, ApplicationIndexFilters $filters, bool $includeApplications, bool $includeKpis): array
    {
        return [
            'applications' => $includeApplications ? $this->applications->paginateForUser($user, $filters) : null,
            'kpis' => $includeKpis ? $this->applications->kpisForUser($user) : null,
        ];
    }
}
