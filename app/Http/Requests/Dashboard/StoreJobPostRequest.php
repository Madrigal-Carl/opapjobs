<?php

namespace App\Http\Requests\Dashboard;

use App\Data\JobPost\StoreJobPostData;

class StoreJobPostRequest extends JobPostFormRequest
{
    public function toDto(): StoreJobPostData
    {
        return $this->jobPostData();
    }
}
