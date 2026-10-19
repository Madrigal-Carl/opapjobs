<?php

namespace App\Repositories\Employer;

use App\Models\Employer;

class EmployerRepository
{
    public function nameExists(int $agencyId, string $name): bool
    {
        return Employer::query()->where('agency_id', $agencyId)
            ->whereRaw('LOWER(employer_name) = LOWER(?)', [$name])->exists();
    }

    /** @param array{agency_id: int, employer_name: string, employer_location: string, employer_license_number: string} $attributes */
    public function create(array $attributes): Employer
    {
        return Employer::query()->create($attributes);
    }
}
