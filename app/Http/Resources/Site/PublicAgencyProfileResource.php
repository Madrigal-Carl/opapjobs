<?php

namespace App\Http\Resources\Site;

use App\Models\Agency;
use Illuminate\Http\Request;

/**
 * The agency profile header, overview and contact block. Contact and
 * social fields are nullable; the page renders whatever is present.
 *
 * @mixin Agency
 */
class PublicAgencyProfileResource extends PublicAgencyCardResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $year = $this->year_established;

        return [
            ...parent::toArray($request),
            'headquartersCity' => $this->cap($this->headquarters_city, 120),
            'about' => $this->cap($this->about, 5000),
            'yearEstablished' => $year,
            'yearsInOperation' => $year === null ? null : max(0, (int) now(config('app.timezone'))->year - $year),
            'size' => $this->cap($this->agency_size, 120),
            'contact' => [
                'phone' => $this->cap($this->getAttribute('public_phone'), 60),
                'email' => $this->cap($this->getAttribute('public_email'), 160),
                'address' => $this->cap($this->getAttribute('public_address'), 255),
            ],
            'social' => [
                'facebook' => $this->cap($this->getAttribute('facebook_url'), 255),
                'instagram' => $this->cap($this->getAttribute('instagram_url'), 255),
                'x' => $this->cap($this->getAttribute('x_url'), 255),
                'website' => $this->cap($this->getAttribute('website_url'), 255),
            ],
        ];
    }
}
