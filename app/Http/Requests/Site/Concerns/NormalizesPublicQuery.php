<?php

namespace App\Http\Requests\Site\Concerns;

use App\Support\PublicAgencyRules;

/**
 * Shared clean-up for public query strings: keywords are trimmed and capped,
 * page numbers fall back to 1.
 */
trait NormalizesPublicQuery
{
    protected function keyword(string $key): ?string
    {
        $value = $this->query($key);
        if (! is_string($value)) {
            return null;
        }

        $value = trim(mb_substr(trim($value), 0, PublicAgencyRules::KEYWORD_MAX_LENGTH));

        return $value === '' ? null : $value;
    }

    protected function pageNumber(string $key): int
    {
        $value = $this->query($key);

        return is_string($value) && ctype_digit($value) && strlen($value) <= 6 && (int) $value >= 1 ? (int) $value : 1;
    }
}
