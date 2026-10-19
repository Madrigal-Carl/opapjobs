<?php

namespace App\Services;

use App\Exceptions\JobPost\AgencyUnavailableException;
use App\Models\Agency;
use App\Models\User;
use App\Repositories\AgencyRepository;

class AgencyService
{
    public function __construct(private AgencyRepository $agencies) {}

    public function forPosting(User $user): Agency
    {
        if ($user->agency_id === null) {
            throw new AgencyUnavailableException(unlinked: true);
        }

        $agency = $this->agencies->find($user->agency_id);
        if ($agency === null || $agency->suspended_at !== null) {
            throw new AgencyUnavailableException;
        }

        return $agency;
    }
}
