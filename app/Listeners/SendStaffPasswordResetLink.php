<?php

namespace App\Listeners;

use App\Events\StaffAccountCreated;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Support\Facades\Password;

class SendStaffPasswordResetLink implements ShouldQueueAfterCommit
{
    /**
     * Handle the event.
     */
    public function handle(StaffAccountCreated $event): void
    {
        Password::broker()->sendResetLink([
            'email' => $event->user->email,
        ]);
    }
}
