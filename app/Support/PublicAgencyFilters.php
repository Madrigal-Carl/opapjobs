<?php

namespace App\Support;

use App\Enums\Pathway;

readonly class PublicAgencyFilters
{
    public function __construct(
        public Pathway $pathway = Pathway::Landbased,
        public ?string $q = null,
        public ?string $country = null,
        public int $page = 1,
    ) {}

    /** @return array{pathway: string, q: string, country: string, page: int} */
    public function toArray(): array
    {
        return ['pathway' => $this->pathway->value, 'q' => $this->q ?? '', 'country' => $this->country ?? '', 'page' => $this->page];
    }
}
