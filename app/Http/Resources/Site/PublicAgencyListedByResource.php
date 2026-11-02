<?php

namespace App\Http\Resources\Site;

use App\Models\Agency;
use Illuminate\Http\Request;

/**
 * The "Listed by" band on a job profile: the agency card plus the three
 * trust figures shown under it.
 *
 * @mixin Agency
 */
class PublicAgencyListedByResource extends PublicAgencyCardResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $year = $this->year_established;

        return [
            ...parent::toArray($request),
            'description' => $this->cap($this->about, 600),
            'yearsInOperation' => $year === null ? null : max(0, (int) now(config('app.timezone'))->year - $year),
            'size' => $this->cap($this->agency_size, 120),
        ];
    }
}
