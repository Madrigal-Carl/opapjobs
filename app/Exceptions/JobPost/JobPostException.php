<?php

namespace App\Exceptions\JobPost;

use Illuminate\Contracts\Debug\ShouldntReport;
use RuntimeException;

abstract class JobPostException extends RuntimeException implements ShouldntReport
{
    public function __construct(string $message, public readonly ?string $field = null, public readonly int $status = 422)
    {
        parent::__construct($message);
    }
}
