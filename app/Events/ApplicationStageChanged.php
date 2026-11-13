<?php

namespace App\Events;

use App\Enums\ApplicationStage;
use App\Models\Application;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** The stage is carried explicitly: by the time a queued listener runs, the application may have moved on. */
class ApplicationStageChanged
{
    use Dispatchable, SerializesModels;

    public function __construct(public Application $application, public ApplicationStage $stage) {}
}
