<?php

namespace App\Listeners;

use App\Events\ApplicationStageChanged;
use App\Notifications\ApplicationStageChangedNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class SendApplicationStageChangedEmail implements ShouldQueueAfterCommit
{
    /** Retries ride out a briefly unavailable mail server. */
    public int $tries = 3;

    public int $backoff = 60;

    /**
     * Handle the event.
     */
    public function handle(ApplicationStageChanged $event): void
    {
        $applicant = $event->application->applicant;

        if ($applicant->trashed()) {
            return;
        }

        $applicant->notify(new ApplicationStageChangedNotification($event->application, $event->stage));
    }
}
