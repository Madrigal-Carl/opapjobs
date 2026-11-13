<?php

namespace App\Notifications;

use App\Models\Application;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Sent from a queued listener, so the notification itself is not queued again. */
class ApplicationSubmittedNotification extends Notification
{
    public function __construct(public Application $application) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(User $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(User $notifiable): MailMessage
    {
        $post = $this->application->jobPost;
        $replacements = ['job' => $post->job_title, 'agency' => $post->agency->agency_name ?? __('the agency')];

        return (new MailMessage)
            ->subject(__('Application sent: :job', $replacements))
            ->greeting(__('Hello :name,', ['name' => $notifiable->name]))
            ->line(__('Your application for :job with :agency was sent successfully.', $replacements))
            ->line(__('The agency will review it, and we will email you whenever your application status changes.'))
            ->action(__('View my applications'), route('applications'));
    }
}
