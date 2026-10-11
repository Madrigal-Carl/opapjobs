<?php

use Illuminate\Support\Facades\File;

test('route files only call controller actions', function () {
    foreach (['web.php', 'settings.php'] as $fileName) {
        $contents = File::get(base_path("routes/{$fileName}"));

        expect($contents)
            ->not->toContain('Route::inertia(')
            ->not->toContain('Route::view(')
            ->not->toContain('Route::redirect(')
            ->not->toMatch(
                '/Route::(?:get|post|put|patch|delete|options|any|match)\s*\([^;]*?(?:function\s*\(|fn\s*\()/s',
            );
    }
});
