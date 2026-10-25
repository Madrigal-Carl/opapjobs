<?php

use App\Enums\Permission;
use App\Events\StaffAccountCreated;
use App\Models\Agency;
use App\Models\Application;
use App\Models\AuditLog;
use App\Models\JobPost;
use App\Models\StaffProfile;
use App\Models\User;
use App\Repositories\AuditLogRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role as PermissionRole;

test('admins can archive active or suspended staff without deleting their records or jobs', function (bool $suspended) {
    $agency = Agency::factory()->create(['agency_user_limit' => 1]);
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $staff = User::factory()->agency()->forAgency($agency)->create([
        'suspended_at' => $suspended ? now() : null,
    ]);
    $profile = StaffProfile::factory()->for($staff, 'user')->create();
    $job = JobPost::factory()->forPoster($staff)->create();
    $application = Application::factory()->for($job)->create();
    DB::table('sessions')->insert([
        'id' => 'archived-staff-session', 'user_id' => $staff->id,
        'payload' => 'payload', 'last_activity' => time(),
    ]);
    DB::table('sessions')->insert([
        'id' => 'admin-session', 'user_id' => $admin->id,
        'payload' => 'payload', 'last_activity' => time(),
    ]);

    $this->actingAs($admin)->from(route('dashboard.accounts'))
        ->patch(route('dashboard.accounts.archive', $staff))
        ->assertRedirect(route('dashboard.accounts'))
        ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Staff account removed.']);

    $this->assertSoftDeleted($staff);
    $this->assertModelExists($profile);
    $this->assertModelExists($job);
    $this->assertModelExists($application);
    expect($job->fresh()->status)->toBe($job->status);
    $this->assertDatabaseMissing('sessions', ['user_id' => $staff->id]);
    $this->assertDatabaseHas('sessions', ['id' => 'admin-session', 'user_id' => $admin->id]);
    $log = AuditLog::query()->where('action', 'account.archived')->sole();
    expect($log->actor_user_id)->toBe($admin->id)
        ->and($log->subject_type)->toBe(User::class)
        ->and($log->subject_id)->toBe($staff->id)
        ->and($log->ip_address)->toBe('127.0.0.1');

    $this->get(route('dashboard.accounts'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('staff.data', 0)
            ->where('seats', ['used' => 0, 'limit' => 1])
            ->loadDeferredProps(fn (Assert $reload) => $reload->where('kpis.total_staff', 0)));
})->with(['active' => false, 'suspended' => true]);

test('archiving a staff account makes its seat and employee id available for a replacement', function () {
    Event::fake([StaffAccountCreated::class]);
    $agency = Agency::factory()->create(['agency_user_limit' => 1]);
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $staff = User::factory()->agency()->forAgency($agency)->create();
    StaffProfile::factory()->for($staff, 'user')->create(['employee_id' => 'STAFF-001']);

    $this->actingAs($admin)->patch(route('dashboard.accounts.archive', $staff))->assertRedirect();
    $this->post(route('dashboard.accounts.store'), [
        'name' => 'Replacement Staff', 'email' => 'replacement@example.test', 'employee_id' => 'staff-001',
    ])->assertRedirect()->assertSessionHasNoErrors();

    $this->assertSoftDeleted($staff);
    $this->assertDatabaseHas('users', ['email' => 'replacement@example.test', 'agency_id' => $agency->id, 'deleted_at' => null]);
});

test('guests cannot archive accounts', function () {
    $staff = User::factory()->agency()->create();

    $this->patch(route('dashboard.accounts.archive', $staff))->assertRedirect(route('login'));

    $this->assertNotSoftDeleted($staff);
});

test('account archiving requires management permission and an agency admin scope', function (string $role) {
    $agency = Agency::factory()->create();
    $staff = User::factory()->agency()->forAgency($agency)->create();
    $actor = User::factory()->{$role}()->forAgency($agency)->create();

    $this->actingAs($actor)->patch(route('dashboard.accounts.archive', $staff))->assertForbidden();

    $this->assertNotSoftDeleted($staff);
    expect(AuditLog::query()->where('action', 'account.archived')->exists())->toBeFalse();
})->with(['agency', 'superadmin']);

test('admins without account management permission cannot archive staff', function () {
    $agency = Agency::factory()->create();
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $staff = User::factory()->agency()->forAgency($agency)->create();
    PermissionRole::findByName('admin')->revokePermissionTo(Permission::ManageAccounts->value);

    $this->actingAs($admin)->patch(route('dashboard.accounts.archive', $staff))->assertForbidden();

    $this->assertNotSoftDeleted($staff);
});

test('admins cannot archive themselves, other roles, or staff outside their agency', function (string $target) {
    $agency = Agency::factory()->create();
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $staff = match ($target) {
        'self' => $admin,
        'other role' => User::factory()->applicant()->forAgency($agency)->create(),
        'other agency' => User::factory()->agency()->forAgency(Agency::factory()->create())->create(),
    };

    $this->actingAs($admin)->patch(route('dashboard.accounts.archive', $staff), ['agency_id' => $staff->agency_id])->assertNotFound();

    $this->assertNotSoftDeleted($staff);
    expect(AuditLog::query()->where('action', 'account.archived')->exists())->toBeFalse();
})->with(['self', 'other role', 'other agency']);

test('an already archived account cannot be archived again or sign in', function () {
    $agency = Agency::factory()->create();
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $staff = User::factory()->agency()->forAgency($agency)->create();

    $this->actingAs($admin)->patch(route('dashboard.accounts.archive', $staff))->assertRedirect();
    $this->patch(route('dashboard.accounts.archive', $staff))->assertNotFound();
    expect(AuditLog::query()->where('action', 'account.archived')->count())->toBe(1);
    $this->post(route('logout'))->assertRedirect();
    $this->post(route('login.store'), ['email' => $staff->email, 'password' => 'password'])->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('archiving the last account on a page returns the preceding page and preserves filters', function () {
    $agency = Agency::factory()->create(['agency_user_limit' => 20]);
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $staff = User::factory()->agency()->forAgency($agency)->count(11)->create(['name' => 'Matching Staff']);
    $url = route('dashboard.accounts', ['q' => 'Matching', 'status' => 'active', 'per_page' => 10, 'page' => 2]);

    $this->actingAs($admin)->from($url)->followingRedirects()
        ->patch(route('dashboard.accounts.archive', $staff->first()))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('staff.data', 10)
        ->where('staff.meta.current_page', 1)
        ->where('staff.meta.last_page', 1)
        ->where('filters', ['q' => 'Matching', 'status' => 'active', 'per_page' => 10])
        ->where('seats.used', 10));
});

test('a failed archive rolls back the account and sessions and returns an Inertia error', function () {
    $agency = Agency::factory()->create();
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $staff = User::factory()->agency()->forAgency($agency)->create();
    DB::table('sessions')->insert([
        'id' => 'retained-session', 'user_id' => $staff->id,
        'payload' => 'payload', 'last_activity' => time(),
    ]);
    $this->partialMock(AuditLogRepository::class)->shouldReceive('log')->once()
        ->andThrow(new RuntimeException('private database failure'));

    $this->actingAs($admin)->from(route('dashboard.accounts'))
        ->patch(route('dashboard.accounts.archive', $staff))
        ->assertRedirect(route('dashboard.accounts'))
        ->assertSessionHasErrors(['account' => 'Something went wrong. The staff account was not removed. Please try again.'])
        ->assertInertiaFlash('toast.message', 'Something went wrong. The staff account was not removed. Please try again.');

    $this->assertNotSoftDeleted($staff);
    $this->assertDatabaseHas('sessions', ['id' => 'retained-session', 'user_id' => $staff->id]);
    expect(AuditLog::query()->where('action', 'account.archived')->exists())->toBeFalse();
});
