<?php

namespace App\Listeners;

use App\Events\ApplicationSubmitted;
use App\Notifications\ApplicationSubmittedNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;

class SendApplicationSubmittedEmail implements ShouldQueueAfterCommit
{
    /** Retries ride out a briefly unavailable mail server. */
    public int $tries = 3;

    public int $backoff = 60;

    /**
     * Handle the event.
     */
    public function handle(ApplicationSubmitted $event): void
    {
        $applicant = $event->application->applicant;

        if ($applicant->trashed()) {
            return;
        }

        $applicant->notify(new ApplicationSubmittedNotification($event->application));
    }
}
