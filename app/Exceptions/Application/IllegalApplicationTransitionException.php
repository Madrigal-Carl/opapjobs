<?php

namespace App\Exceptions\Application;

use App\Enums\ApplicationStage;
use RuntimeException;

class IllegalApplicationTransitionException extends RuntimeException
{
    public static function terminal(ApplicationStage $stage): self
    {
        return new self(__('Applications in the :stage stage can no longer change.', ['stage' => $stage->value]));
    }
}
