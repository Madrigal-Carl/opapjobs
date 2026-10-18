<?php

namespace App\Support;

use App\Enums\JobPostDisplayStatus;
use App\Enums\JobPostSort;
use App\Enums\RecruitmentType;

readonly class JobPostIndexFilters
{
    public function __construct(
        public ?string $q = null,
        public ?JobPostDisplayStatus $status = null,
        public ?RecruitmentType $recruitmentType = null,
        public JobPostSort $sort = JobPostSort::Newest,
        public int $perPage = 10,
        public int $page = 1,
    ) {}

    /** @return array{q: ?string, status: ?string, recruitment_type: ?string, sort: string, per_page: int} */
    public function toArray(): array
    {
        return [
            'q' => $this->q,
            'status' => $this->status?->value,
            'recruitment_type' => $this->recruitmentType?->value,
            'sort' => $this->sort->value,
            'per_page' => $this->perPage,
        ];
    }
}
