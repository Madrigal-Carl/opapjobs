<?php

namespace App\Actions\Site;

use App\Models\Agency;
use App\Services\Site\PublicAgencyService;
use App\Support\PublicAgencyFilters;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ListPublicAgenciesAction
{
    public function __construct(private PublicAgencyService $agencies) {}

    /** @return array{agencies: LengthAwarePaginator<int, Agency>, counts: array{landbased: int, seabased: int}} */
    public function execute(PublicAgencyFilters $filters): array
    {
        return DB::transaction(fn (): array => $this->agencies->directory($filters));
    }
}
