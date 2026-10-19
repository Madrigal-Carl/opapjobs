<?php

namespace App\Services\Employer;

use App\Data\Employer\StoreEmployerData;
use App\Exceptions\Employer\DuplicateEmployerException;
use App\Models\Employer;
use App\Models\User;
use App\Repositories\Employer\EmployerRepository;
use App\Services\AgencyService;
use Illuminate\Database\UniqueConstraintViolationException;

class EmployerService
{
    public function __construct(private AgencyService $agencies, private EmployerRepository $employers) {}

    public function create(User $user, StoreEmployerData $data): Employer
    {
        $agency = $this->agencies->forPosting($user);
        if ($this->employers->nameExists($agency->id, $data->name)) {
            throw new DuplicateEmployerException;
        }

        try {
            return $this->employers->create([
                'agency_id' => $agency->id, 'employer_name' => $data->name,
                'employer_location' => $data->location, 'employer_license_number' => $data->licenseNumber,
            ]);
        } catch (UniqueConstraintViolationException) {
            throw new DuplicateEmployerException;
        }
    }
}
