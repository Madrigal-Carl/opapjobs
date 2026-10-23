<?php

namespace App\Support;

use App\Enums\ApplicationSort;
use App\Enums\ApplicationStage;

readonly class ApplicationIndexFilters
{
    public function __construct(
        public ?string $q = null,
        public ?ApplicationStage $stage = null,
        public ApplicationSort $sort = ApplicationSort::Newest,
        public int $perPage = 10,
        public int $page = 1,
    ) {}

    /** @return array{q: ?string, stage: ?string, sort: string, per_page: int} */
    public function toArray(): array
    {
        return [
            'q' => $this->q,
            'stage' => $this->stage?->value,
            'sort' => $this->sort->value,
            'per_page' => $this->perPage,
        ];
    }
}
