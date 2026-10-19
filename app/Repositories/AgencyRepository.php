<?php

namespace App\Repositories;

use App\Models\Agency;

class AgencyRepository
{
    public function find(int $id): ?Agency
    {
        return Agency::query()->whereKey($id)->lockForUpdate()->first();
    }
}
