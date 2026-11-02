<?php

namespace App\Support;

use Carbon\CarbonInterface;

/**
 * Derived display strings for the applicant-side pages. None of these are
 * stored (docs/database.md §4); they are computed for every response.
 */
final class PublicDisplay
{
    private const MARK_STOP_WORDS = ['of', 'and', 'the', 'for', '&'];

    /** Mirrors `formatJobPostSalary` in resources/js/lib/job-post-salary.ts, plus the " / mo" period. */
    public static function salary(?string $currency, string|int|float|null $min, string|int|float|null $max): string
    {
        if ($min === null && $max === null) {
            return 'Competitive salary';
        }

        $prefix = $currency !== null && $currency !== '' ? $currency.' ' : '';
        $minimum = $min === null ? null : self::amount((float) $min);
        $maximum = $max === null ? null : self::amount((float) $max);

        $amount = match (true) {
            $minimum !== null && $maximum !== null => $prefix.$minimum.($minimum === $maximum ? '' : '–'.$maximum),
            $minimum !== null => $prefix.$minimum.'+',
            default => 'Up to '.$prefix.$maximum,
        };

        return $amount.' / mo';
    }

    public static function postedLabel(CarbonInterface $posted, CarbonInterface $now): string
    {
        $minutes = (int) floor($posted->diffInMinutes($now, true));

        if ($minutes < 60) {
            return 'Just now';
        }

        if ($minutes < 1440) {
            return self::plural(intdiv($minutes, 60), 'hour');
        }

        $days = intdiv($minutes, 1440);

        return match (true) {
            $days < 7 => self::plural($days, 'day'),
            $days < 30 => self::plural(intdiv($days, 7), 'week'),
            default => self::plural(intdiv($days, 30), 'month'),
        };
    }

    /** The trailing part of "Doha, Qatar" — "Qatar"; the whole value when there is no comma. */
    public static function destination(string $location): string
    {
        $parts = array_values(array_filter(array_map('trim', explode(',', $location)), fn (string $part): bool => $part !== ''));

        return count($parts) > 1 ? $parts[count($parts) - 1] : trim($location);
    }

    /** Two or three initials, e.g. "Salinlahi Global Careers" → "SGC". */
    public static function mark(string $name): string
    {
        $words = array_values(array_filter(preg_split('/[\s\-]+/u', trim($name)) ?: [], fn (string $word): bool => $word !== '' && ! in_array(mb_strtolower($word), self::MARK_STOP_WORDS, true)));

        if ($words === []) {
            return '?';
        }

        if (count($words) === 1) {
            return mb_strtoupper(mb_substr($words[0], 0, 2));
        }

        return mb_strtoupper(implode('', array_map(fn (string $word): string => mb_substr($word, 0, 1), array_slice($words, 0, 3))));
    }

    /** "Mariel Santos" → "Mariel S." — never the full surname or an email. */
    public static function reviewerName(string $name): string
    {
        $parts = preg_split('/\s+/u', trim($name)) ?: [];
        $parts = array_values(array_filter($parts, fn (string $part): bool => $part !== '' && ! str_contains($part, '@')));

        if ($parts === []) {
            return 'Applicant';
        }

        if (count($parts) === 1) {
            return mb_substr($parts[0], 0, 40);
        }

        return mb_substr($parts[0], 0, 40).' '.mb_strtoupper(mb_substr($parts[count($parts) - 1], 0, 1)).'.';
    }

    private static function amount(float $value): string
    {
        $formatted = number_format($value, 2);

        return str_contains($formatted, '.') ? rtrim(rtrim($formatted, '0'), '.') : $formatted;
    }

    private static function plural(int $count, string $unit): string
    {
        return $count.' '.$unit.($count === 1 ? '' : 's').' ago';
    }
}
