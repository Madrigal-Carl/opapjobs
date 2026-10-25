<?php

use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function statusAdmin(): User
{
    return User::factory()->admin()->forAgency(Agency::factory()->create())->create();
}

function statusStaff(User $admin): User
{
    $staff = User::factory()->agency()->forAgency($admin->agency)->create();

    StaffProfile::factory()->for($staff, 'user')->create();

    return $staff;
}

test('an admin can suspend a staff account', function () {
    $admin = statusAdmin();
    $staff = statusStaff($admin);

    $this->actingAs($admin)
        ->from(route('dashboard.accounts'))
        ->patch(route('dashboard.accounts.status', $staff), ['status' => 'suspended'])
        ->assertRedirect(route('dashboard.accounts'))
        ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Staff account suspended.']);

    expect($staff->fresh()->suspended_at)->not->toBeNull();

    $log = AuditLog::query()->where('action', 'account.suspended')->sole();

    expect($log->actor_user_id)->toBe($admin->id)
        ->and($log->subject_type)->toBe(User::class)
        ->and($log->subject_id)->toBe($staff->id);
});

test('suspending a staff account deletes its stored sessions', function () {
    $admin = statusAdmin();
    $staff = statusStaff($admin);

    DB::table('sessions')->insert([
        'id' => 'session-one', 'user_id' => $staff->id, 'ip_address' => '127.0.0.1',
        'user_agent' => 'test', 'payload' => 'payload', 'last_activity' => time(),
    ]);

    $this->actingAs($admin)
        ->patch(route('dashboard.accounts.status', $staff), ['status' => 'suspended'])
        ->assertRedirect();

    expect(DB::table('sessions')->where('user_id', $staff->id)->exists())->toBeFalse();
});

test('an admin can reactivate a suspended staff account', function () {
    $admin = statusAdmin();
    $staff = statusStaff($admin);
    $staff->forceFill(['suspended_at' => now()])->save();

    $this->actingAs($admin)
        ->from(route('dashboard.accounts'))
        ->patch(route('dashboard.accounts.status', $staff), ['status' => 'active'])
        ->assertRedirect(route('dashboard.accounts'))
        ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Staff account reactivated.']);

    expect($staff->fresh()->suspended_at)->toBeNull();
    expect(AuditLog::query()->where('action', 'account.reactivated')->exists())->toBeTrue();
});

test('changing to the current status is a no-op', function (string $status, bool $suspended) {
    $admin = statusAdmin();
    $staff = statusStaff($admin);

    if ($suspended) {
        $staff->forceFill(['suspended_at' => now()->subDay()])->save();
    }

    $before = $staff->fresh()->suspended_at;

    $this->actingAs($admin)
        ->patch(route('dashboard.accounts.status', $staff), ['status' => $status])
        ->assertRedirect();

    expect($staff->fresh()->suspended_at?->toIso8601String())->toBe($before?->toIso8601String())
        ->and(AuditLog::query()->where('subject_id', $staff->id)->exists())->toBeFalse();
})->with([
    'already active' => ['active', false],
    'already suspended' => ['suspended', true],
]);

test('the status endpoint rejects unknown statuses', function () {
    $admin = statusAdmin();
    $staff = statusStaff($admin);

    $this->actingAs($admin)
        ->from(route('dashboard.accounts'))
        ->patch(route('dashboard.accounts.status', $staff), ['status' => 'archived'])
        ->assertRedirect(route('dashboard.accounts'))
        ->assertSessionHasErrors('status');

    expect($staff->fresh()->suspended_at)->toBeNull();
});

test('agency users cannot change staff account status', function () {
    $admin = statusAdmin();
    $staff = statusStaff($admin);
    $colleague = User::factory()->agency()->forAgency($admin->agency)->create();

    $this->actingAs($colleague)
        ->patch(route('dashboard.accounts.status', $staff), ['status' => 'suspended'])
        ->assertForbidden();

    expect($staff->fresh()->suspended_at)->toBeNull();
});

test('a suspended staff member cannot sign in', function () {
    $staff = User::factory()->agency()->suspended()->create(['password' => bcrypt('password')]);

    $this->post(route('login.store'), [
        'email' => $staff->email,
        'password' => 'password',
    ])->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('an authenticated suspended user is signed out on the next request', function () {
    $admin = statusAdmin();
    $staff = statusStaff($admin);
    $staff->forceFill(['suspended_at' => now()])->save();

    $this->actingAs($staff)
        ->get(route('dashboard.accounts'))
        ->assertRedirect(route('login'))
        ->assertSessionHas('status', 'Your account has been suspended.');

    $this->assertGuest();
});
