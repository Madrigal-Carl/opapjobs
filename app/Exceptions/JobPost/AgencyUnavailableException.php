<?php

namespace App\Exceptions\JobPost;

class AgencyUnavailableException extends JobPostException
{
    /**
     * Create a new class instance.
     */
    public function __construct(bool $unlinked = false)
    {
        parent::__construct($unlinked
            ? __('Your account is not linked to an agency yet.')
            : __('Your agency is unavailable. Contact your administrator.'), status: 403);
    }
}
