<?php

namespace App\Http\Resources\Site;

use App\Http\Resources\Site\Concerns\CapsStrings;
use App\Models\Agency;
use App\Support\PublicDisplay;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An agency card. Expects the aggregates from `PublicAgencyRepository`
 * (`open_jobs_count`, `hired_count`, `reviews_count`, `reviews_avg_rating`)
 * and the `is_top_hirer` flag set by `PublicAgencyService`.
 *
 * @mixin Agency
 */
class PublicAgencyCardResource extends JsonResource
{
    use CapsStrings;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $reviewCount = (int) $this->getAttribute('reviews_count');
        $average = $this->getAttribute('reviews_avg_rating');

        return [
            'slug' => $this->slug,
            'name' => $this->cap($this->agency_name, 160),
            'location' => $this->cap($this->headquarters_city, 120).', Philippines',
            'mark' => PublicDisplay::mark($this->agency_name),
            'license' => $this->cap($this->dmw_license_number, 60),
            'pathway' => $this->pathway->value,
            'jobs' => (int) $this->getAttribute('open_jobs_count'),
            'hiredCount' => (int) $this->getAttribute('hired_count'),
            'rating' => $reviewCount === 0 || $average === null ? null : round((float) $average, 1),
            'reviewCount' => $reviewCount,
            'verified' => $this->verified_at !== null,
            'topHirer' => (bool) $this->getAttribute('is_top_hirer'),
        ];
    }
}
