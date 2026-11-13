<?php

use App\Enums\ApplicationStage;
use App\Events\ApplicationStageChanged;
use App\Listeners\SendApplicationStageChangedEmail;
use App\Listeners\SendApplicationSubmittedEmail;
use App\Models\Agency;
use App\Models\Application;
use App\Models\JobPost;
use App\Models\User;
use App\Notifications\ApplicationStageChangedNotification;
use App\Notifications\ApplicationSubmittedNotification;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Events\CallQueuedListener;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\Support\PublicCatalog;

beforeEach(function () {
    $this->agency = Agency::factory()->create(['agency_name' => 'Bright Horizons Manpower']);
    $this->poster = User::factory()->agency()->forAgency($this->agency)->create();
    $this->post = JobPost::factory()->forPoster($this->poster)->create(['job_title' => 'Welder']);
    $this->applicant = User::factory()->applicant()->create(['name' => 'Maria Santos']);
});

/** Each call applies to a new job by the same poster: an applicant applies to a job only once. */
function emailedApplication(ApplicationStage $stage = ApplicationStage::Pending): Application
{
    $post = Application::query()->exists()
        ? JobPost::factory()->forPoster(test()->poster)->create(['job_title' => 'Welder'])
        : test()->post;

    return Application::factory()->for($post)->for(test()->applicant, 'applicant')->create(['stage' => $stage]);
}

test('submitting an application emails the applicant once', function () {
    Notification::fake();
    Storage::fake('local');
    $post = PublicCatalog::post(PublicCatalog::agency());
    Storage::disk('local')->put('resumes/maria.pdf', '%PDF-1.4 resume');
    $resume = $this->applicant->documents()->create([
        'document_type' => 'resume', 'original_file_name' => 'resume.pdf', 'storage_path' => 'resumes/maria.pdf',
        'mime_type' => 'application/pdf', 'file_size_bytes' => 15, 'is_primary' => true, 'uploaded_at' => now(),
    ]);

    $this->actingAs($this->applicant)->post("/job/{$post->id}/apply", ['resume_document_id' => $resume->id])
        ->assertSessionHasNoErrors();

    Notification::assertSentToTimes($this->applicant, ApplicationSubmittedNotification::class, 1);
    Notification::assertSentTo($this->applicant, ApplicationSubmittedNotification::class,
        fn (ApplicationSubmittedNotification $notification): bool => $notification->application->is(Application::sole()));
    Notification::assertNotSentTo($this->applicant, ApplicationStageChangedNotification::class);
});

test('every staff stage change emails the applicant once with the new stage', function () {
    Notification::fake();
    $application = emailedApplication();
    $rejected = emailedApplication();

    $this->actingAs($this->poster)->patch(route('dashboard.applications.review', $application));
    foreach (range(1, 3) as $step) {
        $this->patch(route('dashboard.applications.proceed', $application));
    }
    $this->patch(route('dashboard.applications.reject', $rejected), ['note' => 'Internal staff note.']);

    $sent = Notification::sent($this->applicant, ApplicationStageChangedNotification::class);
    expect($sent->map(fn (ApplicationStageChangedNotification $notification): array => [
        $notification->application->id, $notification->stage,
    ])->all())->toBe([
        [$application->id, ApplicationStage::Reviewed],
        [$application->id, ApplicationStage::Shortlisted],
        [$application->id, ApplicationStage::ForInterview],
        [$application->id, ApplicationStage::Endorsed],
        [$rejected->id, ApplicationStage::NotSelected],
    ]);
});

test('ignored auto-reviews and refused transitions send no email', function () {
    Notification::fake();
    $reviewed = emailedApplication(ApplicationStage::Reviewed);
    $hired = emailedApplication(ApplicationStage::Endorsed);

    $this->actingAs($this->poster)->patch(route('dashboard.applications.review', $reviewed));
    $this->patch(route('dashboard.applications.proceed', $hired));
    $this->patch(route('dashboard.applications.reject', $hired));

    Notification::assertNothingSent();
});

test('stage emails are queued and only after the transition commits', function () {
    Queue::fake();
    $application = emailedApplication();

    $this->actingAs($this->poster)->patch(route('dashboard.applications.proceed', $application));

    Queue::assertPushed(CallQueuedListener::class, fn (CallQueuedListener $job): bool => $job->class === SendApplicationStageChangedEmail::class);
    expect(new SendApplicationSubmittedEmail)->toBeInstanceOf(ShouldQueueAfterCommit::class)
        ->and(new SendApplicationStageChangedEmail)->toBeInstanceOf(ShouldQueueAfterCommit::class);
});

test('a rolled back stage change sends no email', function () {
    Notification::fake();
    $application = emailedApplication();

    try {
        DB::transaction(function () use ($application): void {
            ApplicationStageChanged::dispatch($application, ApplicationStage::Shortlisted);

            throw new RuntimeException('Rolled back.');
        });
    } catch (RuntimeException) {
    }

    Notification::assertNothingSent();
});

test('archived applicants are not emailed', function () {
    Notification::fake();
    $application = emailedApplication();
    $this->applicant->delete();

    $this->actingAs($this->poster)->patch(route('dashboard.applications.proceed', $application));

    expect($application->fresh()->stage)->toBe(ApplicationStage::Shortlisted);
    Notification::assertNothingSent();
});

test('the submission email confirms the job and agency', function () {
    $mail = (new ApplicationSubmittedNotification(emailedApplication()))->toMail($this->applicant);

    expect($mail->subject)->toBe('Application sent: Welder')
        ->and($mail->greeting)->toBe('Hello Maria Santos,')
        ->and($mail->introLines[0])->toBe('Your application for Welder with Bright Horizons Manpower was sent successfully.')
        ->and($mail->actionUrl)->toBe(route('applications'));
});

test('each stage email explains the new stage to the applicant', function (ApplicationStage $stage, string $subject, string $firstLine, string $actionRoute) {
    $mail = (new ApplicationStageChangedNotification(emailedApplication($stage), $stage))->toMail($this->applicant);

    expect($mail->subject)->toBe($subject)
        ->and($mail->greeting)->toBe('Hello Maria Santos,')
        ->and($mail->introLines[0])->toBe($firstLine)
        ->and($mail->actionUrl)->toBe(route($actionRoute));
})->with([
    'reviewed' => [ApplicationStage::Reviewed, 'Your application is being reviewed',
        'Your application for Welder is now being reviewed by Bright Horizons Manpower.', 'applications'],
    'shortlisted' => [ApplicationStage::Shortlisted, 'You have been shortlisted for Welder',
        'Good news! You have been shortlisted for Welder by Bright Horizons Manpower.', 'applications'],
    'for interview' => [ApplicationStage::ForInterview, 'You have been selected for an interview for Welder',
        'Good news! You have been selected for an interview for Welder by Bright Horizons Manpower.', 'applications'],
    'endorsed' => [ApplicationStage::Endorsed, 'Congratulations! You have been endorsed for Welder',
        'Congratulations! Bright Horizons Manpower has endorsed you to the employer for Welder.', 'applications'],
    'not selected' => [ApplicationStage::NotSelected, 'Update on your application for Welder',
        'Thank you for your interest in Welder with Bright Horizons Manpower.', 'jobs.index'],
]);

test('the not selected email says the agency is not proceeding and leaves out the staff note', function () {
    $application = emailedApplication(ApplicationStage::NotSelected);
    $application->stageHistory()->create([
        'from_stage' => ApplicationStage::Pending, 'to_stage' => ApplicationStage::NotSelected,
        'note' => 'Internal staff note.', 'created_at' => now(),
    ]);

    $rendered = (string) (new ApplicationStageChangedNotification($application, ApplicationStage::NotSelected))
        ->toMail($this->applicant)->render();

    expect($rendered)->toContain('decided not to proceed with your application')
        ->not->toContain('Internal staff note.');
});

test('pending is never sent as a stage change email', function () {
    new ApplicationStageChangedNotification(emailedApplication(), ApplicationStage::Pending);
})->throws(InvalidArgumentException::class);
