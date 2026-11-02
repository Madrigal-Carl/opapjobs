<?php

namespace App\Support;

readonly class PublicJobPostFilters
{
    public const TOGGLES = ['landbased', 'seabased', 'urgent', 'recent'];

    /** @param list<value-of<self::TOGGLES>> $toggles */
    public function __construct(
        public ?string $q = null,
        public ?string $country = null,
        public array $toggles = [],
        public int $page = 1,
    ) {}

    public function has(string $toggle): bool
    {
        return in_array($toggle, $this->toggles, true);
    }

    /** @return array{q: string, country: string, filters: list<string>} */
    public function toArray(): array
    {
        return ['q' => $this->q ?? '', 'country' => $this->country ?? '', 'filters' => $this->toggles];
    }
}
