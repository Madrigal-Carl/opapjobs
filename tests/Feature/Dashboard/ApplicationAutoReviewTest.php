<?php

use App\Enums\ApplicationStage;
use App\Enums\Permission;
use App\Enums\Role;
use App\Models\Agency;
use App\Models\Application;
use App\Models\AuditLog;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Testing\TestResponse;
use Spatie\Permission\Models\Role as RoleModel;

beforeEach(function () {
    $this->agency = Agency::factory()->create();
});

function autoReviewPostBy(User $poster, Agency $agency): JobPost
{
    return JobPost::factory()->create(['agency_id' => $agency->id, 'posted_by_user_id' => $poster->id]);
}

/** Opens the auto-review endpoint from the detail page, the way the page itself does. */
function autoReviewRequest(User $viewer, Application $application): TestResponse
{
    return test()->actingAs($viewer)->from(route('dashboard.applications.show', $application))
        ->patch(route('dashboard.applications.review', $application));
}

function expectAutoReviewed(Application $application, User $viewer): void
{
    expect($application->fresh()->stage)->toBe(ApplicationStage::Reviewed);

    $history = $application->stageHistory()->get();
    expect($history)->toHaveCount(1)
        ->and($history->first()->from_stage)->toBe(ApplicationStage::Pending)
        ->and($history->first()->to_stage)->toBe(ApplicationStage::Reviewed)
        ->and($history->first()->changed_by_user_id)->toBe($viewer->id)
        ->and($history->first()->note)->toBeNull();

    $audit = AuditLog::query()->where('subject_id', $application->id)->get();
    expect($audit)->toHaveCount(1)
        ->and($audit->first()->action)->toBe('application.stage_changed')
        ->and($audit->first()->subject_type)->toBe(Application::class)
        ->and($audit->first()->changes)->toEqual(['from' => 'pending', 'to' => 'reviewed'])
        ->and($audit->first()->actor_user_id)->toBe($viewer->id)
        ->and($audit->first()->ip_address)->toBe('127.0.0.1');
}

function expectAutoReviewSkipped(Application $application, ApplicationStage $stage = ApplicationStage::Pending): void
{
    expect($application->fresh()->stage)->toBe($stage)
        ->and($application->stageHistory()->count())->toBe(0)
        ->and(AuditLog::query()->count())->toBe(0);
}

test('the agency poster auto-reviews a pending application without a toast', function () {
    $poster = User::factory()->agency()->forAgency($this->agency)->create();
    $application = Application::factory()->for(autoReviewPostBy($poster, $this->agency))->pending()->create();

    autoReviewRequest($poster, $application)
        ->assertRedirect(route('dashboard.applications.show', $application))
        ->assertInertiaFlashMissing('toast');

    expectAutoReviewed($application, $poster);
});

test('an admin of the same agency auto-reviews a post created by an agency user', function () {
    $poster = User::factory()->agency()->forAgency($this->agency)->create();
    $admin = User::factory()->admin()->forAgency($this->agency)->create();
    $application = Application::factory()->for(autoReviewPostBy($poster, $this->agency))->pending()->create();

    autoReviewRequest($admin, $application)->assertRedirect()->assertInertiaFlashMissing('toast');

    expectAutoReviewed($application, $admin);
});

test('another agency user of the same agency cannot reach a colleague post', function () {
    $poster = User::factory()->agency()->forAgency($this->agency)->create();
    $colleague = User::factory()->agency()->forAgency($this->agency)->create();
    $application = Application::factory()->for(autoReviewPostBy($poster, $this->agency))->pending()->create();

    autoReviewRequest($colleague, $application)->assertNotFound();

    expectAutoReviewSkipped($application);
});

test('the admin who created a post auto-reviews it', function () {
    $admin = User::factory()->admin()->forAgency($this->agency)->create();
    $application = Application::factory()->for(autoReviewPostBy($admin, $this->agency))->pending()->create();

    autoReviewRequest($admin, $application)->assertRedirect()->assertInertiaFlashMissing('toast');

    expectAutoReviewed($application, $admin);
});

test('another admin of the same agency leaves an admin created post pending', function () {
    $poster = User::factory()->admin()->forAgency($this->agency)->create();
    $otherAdmin = User::factory()->admin()->forAgency($this->agency)->create();
    $application = Application::factory()->for(autoReviewPostBy($poster, $this->agency))->pending()->create();

    autoReviewRequest($otherAdmin, $application)->assertRedirect()->assertInertiaFlashMissing('toast');

    expectAutoReviewSkipped($application);
});

test('only the superadmin who created a post auto-reviews it', function () {
    $poster = User::factory()->superadmin()->create();
    $otherSuperadmin = User::factory()->superadmin()->create();
    $agencyAdmin = User::factory()->admin()->forAgency($this->agency)->create();
    $application = Application::factory()->for(autoReviewPostBy($poster, $this->agency))->pending()->create();

    autoReviewRequest($otherSuperadmin, $application)->assertRedirect()->assertInertiaFlashMissing('toast');
    autoReviewRequest($agencyAdmin, $application)->assertRedirect()->assertInertiaFlashMissing('toast');
    expectAutoReviewSkipped($application);

    autoReviewRequest($poster, $application)->assertRedirect()->assertInertiaFlashMissing('toast');
    expectAutoReviewed($application, $poster);
});

test('admins of other agencies and superadmins who did not post never auto-review', function (string $viewer, int $status) {
    $poster = User::factory()->agency()->forAgency($this->agency)->create();
    $application = Application::factory()->for(autoReviewPostBy($poster, $this->agency))->pending()->create();
    $user = match ($viewer) {
        'foreign admin' => User::factory()->admin()->forAgency(Agency::factory()->create())->create(),
        'superadmin' => User::factory()->superadmin()->create(),
    };

    autoReviewRequest($user, $application)->assertStatus($status);

    expectAutoReviewSkipped($application);
})->with([
    'an admin of another agency is scoped out' => ['foreign admin', 404],
    'a superadmin who is not the poster is ignored' => ['superadmin', 302],
]);

test('applications past pending are left untouched', function (ApplicationStage $stage) {
    $poster = User::factory()->agency()->forAgency($this->agency)->create();
    $application = Application::factory()->for(autoReviewPostBy($poster, $this->agency))->create(['stage' => $stage]);

    autoReviewRequest($poster, $application)->assertRedirect()->assertInertiaFlashMissing('toast');

    expectAutoReviewSkipped($application, $stage);
})->with([
    'reviewed' => [ApplicationStage::Reviewed],
    'shortlisted' => [ApplicationStage::Shortlisted],
    'for_interview' => [ApplicationStage::ForInterview],
    'endorsed' => [ApplicationStage::Endorsed],
    'not_selected' => [ApplicationStage::NotSelected],
]);

test('opening the same application twice reviews it once', function () {
    $poster = User::factory()->agency()->forAgency($this->agency)->create();
    $application = Application::factory()->for(autoReviewPostBy($poster, $this->agency))->pending()->create();

    autoReviewRequest($poster, $application)->assertRedirect();
    autoReviewRequest($poster, $application)->assertRedirect()->assertInertiaFlashMissing('toast');

    expectAutoReviewed($application, $poster);
});

test('staff without the manage applications permission are blocked', function () {
    RoleModel::findByName(Role::Agency->value)->revokePermissionTo(Permission::ManageApplications->value);
    $poster = User::factory()->agency()->forAgency($this->agency)->create();
    $application = Application::factory()->for(autoReviewPostBy($poster, $this->agency))->pending()->create();

    autoReviewRequest($poster, $application)->assertForbidden();

    expectAutoReviewSkipped($application);
});

test('viewing the detail page does not change the stage by itself', function () {
    $poster = User::factory()->agency()->forAgency($this->agency)->create();
    $application = Application::factory()->for(autoReviewPostBy($poster, $this->agency))->pending()->create();

    $this->actingAs($poster)->get(route('dashboard.applications.show', $application))
        ->assertOk()->assertInertia(fn ($page) => $page->where('application.stage', 'pending'));

    expectAutoReviewSkipped($application);
});

test('the detail page tells the client whether an admin created the post', function () {
    $admin = User::factory()->admin()->forAgency($this->agency)->create();
    $application = Application::factory()->for(autoReviewPostBy($admin, $this->agency))->pending()->create();

    $this->actingAs($admin)->get(route('dashboard.applications.show', $application))
        ->assertOk()->assertInertia(fn ($page) => $page
        ->where('application.job.posted_by_user_id', $admin->id)
        ->where('application.job.agency_id', $this->agency->id)
        ->where('application.job.poster_is_admin', true));
});
