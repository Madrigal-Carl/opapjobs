<?php

namespace App\Exceptions\Account;

use Illuminate\Contracts\Debug\ShouldntReport;
use RuntimeException;

abstract class AccountException extends RuntimeException implements ShouldntReport
{
    public function __construct(string $message, public readonly ?string $field = null, public readonly int $status = 422)
    {
        parent::__construct($message);
    }
}
