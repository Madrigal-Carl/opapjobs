<?php

namespace App\Notifications;

use App\Enums\ApplicationStage;
use App\Models\Application;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use InvalidArgumentException;

/**
 * Tells the applicant their application moved to a new stage. Staff notes are
 * never included. Sent from a queued listener, so it is not queued again.
 */
class ApplicationStageChangedNotification extends Notification
{
    public function __construct(public Application $application, public ApplicationStage $stage)
    {
        if ($stage === ApplicationStage::Pending) {
            throw new InvalidArgumentException('Pending is announced by ApplicationSubmittedNotification.');
        }
    }

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
        [$subject, $lines] = $this->content($replacements);

        $message = (new MailMessage)
            ->subject($subject)
            ->greeting(__('Hello :name,', ['name' => $notifiable->name]));

        foreach ($lines as $line) {
            $message->line($line);
        }

        return $this->stage === ApplicationStage::NotSelected
            ? $message->action(__('Browse other jobs'), route('jobs.index'))
            : $message->action(__('View my applications'), route('applications'));
    }

    /**
     * @param  array{job: string, agency: string}  $replacements
     * @return array{0: string, 1: list<string>}
     */
    private function content(array $replacements): array
    {
        return match ($this->stage) {
            ApplicationStage::Reviewed => [
                __('Your application is being reviewed'),
                [
                    __('Your application for :job is now being reviewed by :agency.', $replacements),
                    __('We will email you again when there is an update.'),
                ],
            ],
            ApplicationStage::Shortlisted => [
                __('You have been shortlisted for :job', $replacements),
                [
                    __('Good news! You have been shortlisted for :job by :agency.', $replacements),
                    __('The agency may contact you about the next steps, so keep an eye on your email and phone.'),
                ],
            ],
            ApplicationStage::ForInterview => [
                __('You have been selected for an interview for :job', $replacements),
                [
                    __('Good news! You have been selected for an interview for :job by :agency.', $replacements),
                    __('The agency will contact you with the interview schedule and details, so keep an eye on your email and phone.'),
                ],
            ],
            ApplicationStage::Endorsed => [
                __('Congratulations! You have been endorsed for :job', $replacements),
                [
                    __('Congratulations! :agency has endorsed you to the employer for :job.', $replacements),
                    __("The agency will keep you updated on the employer's decision and the next steps, such as your documents."),
                ],
            ],
            ApplicationStage::NotSelected => [
                __('Update on your application for :job', $replacements),
                [
                    __('Thank you for your interest in :job with :agency.', $replacements),
                    __('After careful consideration, the agency has decided not to proceed with your application at this time.'),
                    __('We encourage you to keep applying for other jobs that match your experience.'),
                ],
            ],
            ApplicationStage::Pending => throw new InvalidArgumentException('Pending is announced by ApplicationSubmittedNotification.'),
        };
    }
}
