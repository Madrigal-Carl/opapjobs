<?php

namespace App\Exceptions\Employer;

use App\Exceptions\JobPost\JobPostException;

class DuplicateEmployerException extends JobPostException
{
    /**
     * Create a new class instance.
     */
    public function __construct()
    {
        parent::__construct(__('An employer with this name already exists in your agency.'), 'employer_name');
    }
}
