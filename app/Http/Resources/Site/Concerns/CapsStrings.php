<?php

namespace App\Http\Resources\Site\Concerns;

/** Keeps every free-text value a public resource passes through within a known length. */
trait CapsStrings
{
    protected function cap(?string $value, int $length = 255): ?string
    {
        return $value === null ? null : mb_substr($value, 0, $length);
    }
}
