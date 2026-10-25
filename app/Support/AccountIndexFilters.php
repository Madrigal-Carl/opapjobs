<?php

namespace App\Support;

use Illuminate\Http\Request;

readonly class AccountIndexFilters
{
    public function __construct(
        public ?string $q = null,
        public ?string $status = null,
        public int $perPage = 10,
        public int $page = 1,
    ) {}

    public static function fromRequest(Request $request): self
    {
        $perPage = (int) $request->input('per_page', 10);
        $page = (int) $request->input('page', 1);
        $q = $request->input('q');
        $status = $request->input('status');

        return new self(
            q: is_string($q) && trim($q) !== '' ? trim($q) : null,
            status: in_array($status, ['active', 'suspended'], true) ? $status : null,
            perPage: in_array($perPage, [10, 25, 50], true) ? $perPage : 10,
            page: max(1, $page),
        );
    }

    /** @return array{q: ?string, status: ?string, per_page: int} */
    public function toArray(): array
    {
        return ['q' => $this->q, 'status' => $this->status, 'per_page' => $this->perPage];
    }
}
