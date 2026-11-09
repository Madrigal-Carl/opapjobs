<?php

use Illuminate\Support\Facades\View;

test('only supported appearance cookies reach the shared view data', function (?string $cookie, string $expected) {
    if ($cookie !== null) {
        $this->withUnencryptedCookie('appearance', $cookie);
    }

    $this->get(route('login'))->assertOk();

    expect(View::shared('appearance'))->toBe($expected);
})->with([
    'light' => ['light', 'light'],
    'dark' => ['dark', 'dark'],
    'system' => ['system', 'system'],
    'missing' => [null, 'system'],
    'empty' => ['', 'system'],
    'unsupported' => ['sepia', 'system'],
    'wrong case' => ['DARK', 'system'],
    'markup' => ['<script>alert(1)</script>', 'system'],
    'oversized' => [str_repeat('dark', 1024), 'system'],
]);
