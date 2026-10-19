<?php

namespace App\Data\JobPost;

readonly class JobPostDuplicateData
{
    public function __construct(public ?int $employerId, public string $title, public int $subcategoryId) {}
}
