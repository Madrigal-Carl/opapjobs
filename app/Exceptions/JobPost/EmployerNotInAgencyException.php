<?php

namespace App\Exceptions\JobPost;

class EmployerNotInAgencyException extends JobPostException
{
    /**
     * Create a new class instance.
     */
    public function __construct()
    {
        parent::__construct(__('Choose an active employer belonging to your agency.'), 'employer_id');
    }
}
