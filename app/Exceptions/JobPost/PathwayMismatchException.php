<?php

namespace App\Exceptions\JobPost;

class PathwayMismatchException extends JobPostException
{
    /**
     * Create a new class instance.
     */
    public function __construct()
    {
        parent::__construct(__('Choose an active subcategory from your agency’s pathway.'), 'job_subcategory_id');
    }
}
