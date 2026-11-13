<?php

use App\Enums\ApplicationStage;
use App\Enums\Permission;
use App\Enums\Role;
use App\Models\Agency;
use App\Models\Application;
use App\Models\AuditLog;
use App\Models\JobPost;
use App\Models\User;
use Spatie\Permission\Models\Role as RoleModel;

beforeEach(function () {
    $this->poster = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $this->post = JobPost::factory()->forPoster($this->poster)->create();
});

test('proceeding walks the whole pipeline and records history and audit entries', function () {
    $application = Application::factory()->for($this->post)->pending()->create();
    $steps = [
        ['shortlisted', 'Application moved to Shortlisted.'],
        ['for_interview', 'Application moved to For Interview.'],
        ['endorsed', 'Application moved to Endorsed.'],
    ];
    $from = ApplicationStage::Pending;

    foreach ($steps as [$stage, $message]) {
        $this->actingAs($this->poster)->from(route('dashboard.applications'))
            ->patch(route('dashboard.applications.proceed', $application))
            ->assertRedirect(route('dashboard.applications'))
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => $message]);

        expect($application->fresh()->stage)->toBe(ApplicationStage::from($stage));
        $this->assertDatabaseHas('application_stage_history', [
            'application_id' => $application->id, 'from_stage' => $from->value,
            'to_stage' => $stage, 'changed_by_user_id' => $this->poster->id,
        ]);
        $from = ApplicationStage::from($stage);
    }

    expect($application->stageHistory()->count())->toBe(3);

    $audit = AuditLog::query()->where('subject_id', $application->id)->where('action', 'application.stage_changed')->orderBy('id')->get();
    expect($audit)->toHaveCount(3)
        ->and($audit->first()->changes)->toEqual(['from' => 'pending', 'to' => 'shortlisted'])
        ->and($audit->last()->changes)->toEqual(['from' => 'for_interview', 'to' => 'endorsed'])
        ->and($audit->every(fn (AuditLog $log): bool => $log->actor_user_id === $this->poster->id
            && $log->subject_type === Application::class
            && $log->ip_address === '127.0.0.1'))->toBeTrue();
});

test('a reviewed application proceeds to shortlisted', function () {
    $application = Application::factory()->for($this->post)->reviewed()->create();

    $this->actingAs($this->poster)->from(route('dashboard.applications'))
        ->patch(route('dashboard.applications.proceed', $application))
        ->assertRedirect(route('dashboard.applications'))
        ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Application moved to Shortlisted.']);

    expect($application->fresh()->stage)->toBe(ApplicationStage::Shortlisted);
    $this->assertDatabaseHas('application_stage_history', [
        'application_id' => $application->id, 'from_stage' => 'reviewed',
        'to_stage' => 'shortlisted', 'changed_by_user_id' => $this->poster->id,
    ]);
});

test('terminal applications refuse further transitions', function (ApplicationStage $stage) {
    $application = Application::factory()->for($this->post)->create(['stage' => $stage]);
    $message = "Applications in the {$stage->label()} stage can no longer change.";

    foreach (['proceed', 'reject'] as $transition) {
        $this->actingAs($this->poster)->from(route('dashboard.applications'))
            ->patch(route("dashboard.applications.{$transition}", $application))
            ->assertRedirect(route('dashboard.applications'))
            ->assertInertiaFlash('toast', ['type' => 'error', 'message' => $message]);

        expect($application->fresh()->stage)->toBe($stage);
    }

    expect($application->stageHistory()->count())->toBe(0);
    expect(AuditLog::query()->count())->toBe(0);
})->with([
    'endorsed' => [ApplicationStage::Endorsed],
    'not_selected' => [ApplicationStage::NotSelected],
]);

test('rejecting moves any open stage to rejected and keeps the note', function (ApplicationStage $stage) {
    $application = Application::factory()->for($this->post)->create(['stage' => $stage]);

    $this->actingAs($this->poster)->from(route('dashboard.applications'))
        ->patch(route('dashboard.applications.reject', $application), ['note' => 'No longer available for this assignment.'])
        ->assertRedirect(route('dashboard.applications'))
        ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Application marked as not selected.']);

    expect($application->fresh()->stage)->toBe(ApplicationStage::NotSelected);
    $this->assertDatabaseHas('application_stage_history', [
        'application_id' => $application->id, 'from_stage' => $stage->value,
        'to_stage' => 'not_selected', 'note' => 'No longer available for this assignment.',
        'changed_by_user_id' => $this->poster->id,
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'actor_user_id' => $this->poster->id, 'action' => 'application.stage_changed', 'subject_id' => $application->id,
    ]);
})->with([
    'pending' => [ApplicationStage::Pending],
    'reviewed' => [ApplicationStage::Reviewed],
    'shortlisted' => [ApplicationStage::Shortlisted],
    'for_interview' => [ApplicationStage::ForInterview],
]);

test('reject notes longer than five hundred characters are rejected without a transition', function () {
    $application = Application::factory()->for($this->post)->pending()->create();

    $this->actingAs($this->poster)->from(route('dashboard.applications'))
        ->patch(route('dashboard.applications.reject', $application), ['note' => str_repeat('x', 501)])
        ->assertRedirect(route('dashboard.applications'))->assertSessionHasErrors('note');

    expect($application->fresh()->stage)->toBe(ApplicationStage::Pending);
    expect($application->stageHistory()->count())->toBe(0);
});

test('terminal transitions return a validation response to JSON clients', function () {
    $application = Application::factory()->for($this->post)->endorsed()->create();

    $this->actingAs($this->poster)
        ->patchJson(route('dashboard.applications.proceed', $application))
        ->assertStatus(422)
        ->assertJson(['message' => 'Applications in the Endorsed stage can no longer change.']);

    expect($application->fresh()->stage)->toBe(ApplicationStage::Endorsed);
});

test('staff without the manage applications permission cannot transition', function () {
    RoleModel::findByName(Role::Agency->value)->revokePermissionTo(Permission::ManageApplications->value);
    $application = Application::factory()->for($this->post)->pending()->create();

    $this->actingAs($this->poster)->patch(route('dashboard.applications.proceed', $application))->assertForbidden();
    $this->patch(route('dashboard.applications.reject', $application))->assertForbidden();

    expect($application->fresh()->stage)->toBe(ApplicationStage::Pending);
});

test('staff cannot transition applications outside their scope', function () {
    $foreignPoster = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $application = Application::factory()->for(JobPost::factory()->forPoster($foreignPoster))->pending()->create();

    $this->actingAs($this->poster)->patch(route('dashboard.applications.proceed', $application))->assertNotFound();
    $this->patch(route('dashboard.applications.reject', $application))->assertNotFound();

    expect($application->fresh()->stage)->toBe(ApplicationStage::Pending);
});

test('application rows expose the transition flags for every stage', function (ApplicationStage $stage, bool $canProceed, ?string $next, bool $canReject) {
    $application = Application::factory()->for($this->post)->create(['stage' => $stage]);

    $this->actingAs($this->poster)->get(route('dashboard.applications'))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->where('canManageApplications', true)
        ->has('applications.data', 1)
        ->where('applications.data.0.can_proceed', $canProceed)
        ->where('applications.data.0.next_stage', $next)
        ->where('applications.data.0.can_reject', $canReject)
        ->where('applications.data.0.available_transitions', array_keys(array_filter([
            'proceed' => $canProceed, 'reject' => $canReject,
        ]))));
})->with([
    'pending' => [ApplicationStage::Pending, true, 'shortlisted', true],
    'reviewed' => [ApplicationStage::Reviewed, true, 'shortlisted', true],
    'shortlisted' => [ApplicationStage::Shortlisted, true, 'for_interview', true],
    'for_interview' => [ApplicationStage::ForInterview, true, 'endorsed', true],
    'endorsed' => [ApplicationStage::Endorsed, false, null, false],
    'not_selected' => [ApplicationStage::NotSelected, false, null, false],
]);

test('view only staff receive no application transition capability', function () {
    RoleModel::findByName(Role::Agency->value)->revokePermissionTo(Permission::ManageApplications->value);
    $application = Application::factory()->for($this->post)->pending()->create();

    $this->actingAs($this->poster)->get(route('dashboard.applications'))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->where('canManageApplications', false)
        ->where('applications.data.0.can_proceed', false)
        ->where('applications.data.0.next_stage', 'shortlisted')
        ->where('applications.data.0.can_reject', false)
        ->where('applications.data.0.available_transitions', []));
});
