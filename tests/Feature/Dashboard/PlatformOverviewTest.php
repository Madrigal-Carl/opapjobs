<?php

use App\Enums\ApplicationStage;
use App\Models\Agency;
use App\Models\Application;
use App\Models\ApplicationStageHistory;
use App\Models\JobPost;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('the platform overview reports real totals scoped to the admin agency', function () {
    $agency = Agency::factory()->create();
    $admin = User::factory()->admin()->forAgency($agency)->create();

    $nurse = JobPost::factory()->forPoster($admin)->create(['job_title' => 'Registered Nurse']);
    $chef = JobPost::factory()->forPoster($admin)->create(['job_title' => 'Sous Chef']);
    JobPost::factory()->forPoster($admin)->archived()->create(['job_title' => 'Retired Welder']);

    $pending = Application::factory()->for($nurse)->count(3)->create([
        'submitted_at' => '2026-06-12 09:00:00',
    ]);
    Application::factory()->for($chef)->hired()->create([
        'submitted_at' => '2026-06-20 09:00:00',
    ]);
    Application::factory()->for($chef)->rejected()->create([
        'submitted_at' => '2026-06-20 09:00:00',
    ]);

    // Stage movement is dated from the history table, not from the day
    // the application arrived — this one lands on its own day.
    ApplicationStageHistory::create([
        'application_id' => $pending->first()->id,
        'from_stage' => ApplicationStage::Pending,
        'to_stage' => ApplicationStage::Reviewed,
        'changed_by_user_id' => $admin->id,
        'created_at' => '2026-06-13 10:00:00',
    ]);

    $this->actingAs($admin)
        ->get(route('dashboard.overview'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/overview/platform')
            ->where('platformOverview.summary', [
                'total_jobs' => 3,
                'active_jobs' => 2,
                'total_applications' => 5,
                'stage_counts' => [
                    'Pending' => 3,
                    'Reviewed' => 0,
                    'Shortlisted' => 0,
                    'Interviewed' => 0,
                    'Hired' => 1,
                    'Rejected' => 1,
                ],
                'conversion_rate' => 20,
            ])
            ->where('platformOverview.range', [
                'start' => '2026-06-12',
                'end' => '2026-06-20',
            ])
            ->where('platformOverview.top_jobs', [
                ['id' => $nurse->id, 'title' => 'Registered Nurse', 'applicants' => 3],
                ['id' => $chef->id, 'title' => 'Sous Chef', 'applicants' => 2],
            ])
            ->where('platformOverview.days', [
                ['date' => '2026-06-12', 'applications' => 3, 'reviewed' => 0, 'interview' => 0, 'hired' => 0],
                ['date' => '2026-06-13', 'applications' => 0, 'reviewed' => 1, 'interview' => 0, 'hired' => 0],
                ['date' => '2026-06-20', 'applications' => 2, 'reviewed' => 0, 'interview' => 0, 'hired' => 0],
            ])
        );
});

test('another agency job posts and applications never reach the platform overview', function () {
    $admin = User::factory()->admin()->forAgency(Agency::factory()->create())->create();

    JobPost::factory()->forPoster($admin)->count(2)->create();
    Application::factory()->count(4)->create();

    $this->actingAs($admin)
        ->get(route('dashboard.overview'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('platformOverview.summary.total_jobs', 2)
            ->where('platformOverview.summary.total_applications', 0)
            ->where('platformOverview.top_jobs', [])
            ->where('platformOverview.range', null)
        );
});

test('an overview with no submissions yet reports zeros and a null range', function () {
    $admin = User::factory()->admin()->forAgency(Agency::factory()->create())->create();
    JobPost::factory()->forPoster($admin)->create();

    $this->actingAs($admin)
        ->get(route('dashboard.overview'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('platformOverview.summary', [
                'total_jobs' => 1,
                'active_jobs' => 1,
                'total_applications' => 0,
                'stage_counts' => [
                    'Pending' => 0,
                    'Reviewed' => 0,
                    'Shortlisted' => 0,
                    'Interviewed' => 0,
                    'Hired' => 0,
                    'Rejected' => 0,
                ],
                'conversion_rate' => 0,
            ])
            ->where('platformOverview.days', [])
            ->where('platformOverview.range', null)
        );
});

test('the hiring and system overviews keep their reference data', function (string $role, string $component) {
    $this->actingAs(User::factory()->{$role}()->create())
        ->get(route('dashboard.overview'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component($component)
            ->missing('platformOverview'));
})->with([
    'hiring' => ['agency', 'dashboard/overview/hiring'],
    'system' => ['superadmin', 'dashboard/overview/system'],
]);
