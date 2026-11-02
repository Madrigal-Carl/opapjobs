<?php

use App\Support\PublicDisplay;
use Carbon\CarbonImmutable;

test('salary ranges read as a monthly amount', function (?string $currency, mixed $min, mixed $max, string $expected) {
    expect(PublicDisplay::salary($currency, $min, $max))->toBe($expected);
})->with([
    'range' => ['SAR', '2500.00', '3200.00', 'SAR 2,500–3,200 / mo'],
    'equal ends' => ['QAR', 3000, 3000, 'QAR 3,000 / mo'],
    'minimum only' => ['USD', '1200.50', null, 'USD 1,200.5+ / mo'],
    'maximum only' => ['AED', null, 4000, 'Up to AED 4,000 / mo'],
    'no currency' => [null, 900, 1100, '900–1,100 / mo'],
    'no amounts' => ['SAR', null, null, 'Competitive salary'],
]);

test('posted labels count back from now', function (string $ago, string $expected) {
    $now = CarbonImmutable::parse('2026-11-02 12:00:00');

    expect(PublicDisplay::postedLabel($now->modify($ago), $now))->toBe($expected);
})->with([
    ['-5 minutes', 'Just now'],
    ['-1 hour', '1 hour ago'],
    ['-23 hours', '23 hours ago'],
    ['-1 day', '1 day ago'],
    ['-6 days', '6 days ago'],
    ['-7 days', '1 week ago'],
    ['-29 days', '4 weeks ago'],
    ['-65 days', '2 months ago'],
]);

test('destination keeps only the country of a location', function () {
    expect(PublicDisplay::destination('Plant 4, Jubail, Saudi Arabia'))->toBe('Saudi Arabia')
        ->and(PublicDisplay::destination('Qatar'))->toBe('Qatar')
        ->and(PublicDisplay::destination('Doha,Qatar'))->toBe('Qatar');
});

test('marks and reviewer names never expose more than initials', function () {
    expect(PublicDisplay::mark('Salinlahi Global Careers and Services'))->toBe('SGC')
        ->and(PublicDisplay::mark('Kalinaw'))->toBe('KA')
        ->and(PublicDisplay::reviewerName('Mariel dela Santos'))->toBe('Mariel S.')
        ->and(PublicDisplay::reviewerName('mariel@example.test'))->toBe('Applicant');
});
