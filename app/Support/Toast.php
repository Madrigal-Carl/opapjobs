<?php

namespace App\Support;

use Inertia\Inertia;

class Toast
{
    public static function success(string $message): void
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);
    }

    public static function error(string $message): void
    {
        Inertia::flash('toast', ['type' => 'error', 'message' => $message]);
    }

    public static function warning(string $message): void
    {
        Inertia::flash('toast', ['type' => 'warning', 'message' => $message]);
    }

    public static function info(string $message): void
    {
        Inertia::flash('toast', ['type' => 'info', 'message' => $message]);
    }
}
