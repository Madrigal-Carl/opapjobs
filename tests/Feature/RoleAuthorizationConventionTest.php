<?php

use Illuminate\Support\Facades\File;

test('application code authorizes by permission, not by role', function () {
    $offenders = collect(File::allFiles(app_path()))
        ->filter(fn (SplFileInfo $file): bool => str_contains($file->getContents(), '->hasRole('))
        ->map(fn (SplFileInfo $file): string => str_replace('\\', '/', $file->getRelativePathname()))
        ->reject(fn (string $path): bool => $path === 'Providers/AppServiceProvider.php')
        ->values();

    expect($offenders)->toBeEmpty();
});
