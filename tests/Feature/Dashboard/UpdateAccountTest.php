<?php

use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\StaffProfile;
use App\Models\User;

function updateAdmin(): User
{
    return User::factory()->admin()->forAgency(Agency::factory()->create())->create();
}

function updateStaff(User $admin, array $attributes = [], array $profile = []): User
{
    $staff = User::factory()->agency()->forAgency($admin->agency)->create($attributes);

    StaffProfile::factory()->for($staff, 'user')->create(array_merge([
        'phone' => '+63 917 000 0000',
        'notes' => 'Original notes',
    ], $profile));

    return $staff;
}

function updatePayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Updated Name',
        'email' => 'updated@example.test',
        'phone' => '+63 917 123 4567',
        'notes' => 'Updated notes.',
    ], $overrides);
}

test('an admin can update an editable staff account', function () {
    $admin = updateAdmin();
    $staff = updateStaff($admin);

    $this->actingAs($admin)
        ->from(route('dashboard.accounts'))
        ->put(route('dashboard.accounts.update', $staff), updatePayload())
        ->assertRedirect(route('dashboard.accounts'))
        ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Staff account updated.']);

    $staff->refresh();

    expect($staff->name)->toBe('Updated Name')
        ->and($staff->email)->toBe('updated@example.test')
        ->and($staff->staffProfile->phone)->toBe('+63 917 123 4567')
        ->and($staff->staffProfile->notes)->toBe('Updated notes.');
});

test('updating keeps the email lowercased and trimmed', function () {
    $admin = updateAdmin();
    $staff = updateStaff($admin);

    $this->actingAs($admin)
        ->put(route('dashboard.accounts.update', $staff), updatePayload(['email' => '  MiXeD@Example.Test ']))
        ->assertRedirect();

    expect($staff->fresh()->email)->toBe('mixed@example.test');
});

test('a staff account can keep its own email', function () {
    $admin = updateAdmin();
    $staff = updateStaff($admin, ['email' => 'same@example.test']);

    $this->actingAs($admin)
        ->put(route('dashboard.accounts.update', $staff), updatePayload([
            'email' => 'same@example.test',
        ]))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($staff->fresh()->email)->toBe('same@example.test');
});

test('updating rejects an email used by a colleague', function (string $field, string $value, string $error) {
    $admin = updateAdmin();
    $staff = updateStaff($admin);
    $colleague = updateStaff($admin, ['email' => 'colleague@example.test']);

    $this->actingAs($admin)
        ->from(route('dashboard.accounts'))
        ->put(route('dashboard.accounts.update', $staff), updatePayload([$field => $value]))
        ->assertRedirect(route('dashboard.accounts'))
        ->assertSessionHasErrors($error)
        ->assertInertiaFlash('toast.message', 'Please fix the highlighted fields.');

    expect($colleague->id)->not->toBe($staff->id);
})->with([
    'email' => ['email', 'COLLEAGUE@example.test', 'email'],
]);

test('updating cannot change the role, agency or status from the payload', function () {
    $admin = updateAdmin();
    $otherAgency = Agency::factory()->create();
    $staff = updateStaff($admin);

    $this->actingAs($admin)
        ->put(route('dashboard.accounts.update', $staff), updatePayload([
            'role' => 'superadmin',
            'roles' => ['superadmin'],
            'agency_id' => $otherAgency->id,
            'status' => 'suspended',
            'suspended_at' => now()->toIso8601String(),
        ]))
        ->assertRedirect();

    $staff->refresh();

    expect($staff->agency_id)->toBe($admin->agency_id)
        ->and($staff->suspended_at)->toBeNull()
        ->and($staff->getRoleNames()->all())->toBe(['agency']);
});

test('updating validates the submitted fields', function (string $field, mixed $value) {
    $admin = updateAdmin();
    $staff = updateStaff($admin);

    $this->actingAs($admin)
        ->from(route('dashboard.accounts'))
        ->put(route('dashboard.accounts.update', $staff), updatePayload([$field => $value]))
        ->assertRedirect(route('dashboard.accounts'))
        ->assertSessionHasErrors($field)
        ->assertInertiaFlash('toast.message', 'Please fix the highlighted fields.');
})->with([
    'missing name' => ['name', ''],
    'invalid email' => ['email', 'nope'],
    'long notes' => ['notes', str_repeat('x', 1001)],
]);

test('updating records the changed field names in the audit log', function () {
    $admin = updateAdmin();
    $staff = updateStaff($admin);

    $this->actingAs($admin)
        ->put(route('dashboard.accounts.update', $staff), updatePayload([
            'name' => 'Only The Name Changed',
            'email' => $staff->email,
            'phone' => '+63 917 000 0000',
            'notes' => 'Original notes',
        ]))
        ->assertRedirect();

    $log = AuditLog::query()->where('action', 'account.updated')->sole();

    expect($log->actor_user_id)->toBe($admin->id)
        ->and($log->subject_type)->toBe(User::class)
        ->and($log->subject_id)->toBe($staff->id)
        ->and($log->changes['changed'])->toBe(['name']);
});

test('an unchanged update does not write an audit log', function () {
    $admin = updateAdmin();
    $staff = updateStaff($admin);

    $this->actingAs($admin)
        ->put(route('dashboard.accounts.update', $staff), updatePayload([
            'name' => $staff->name,
            'email' => $staff->email,
            'phone' => '+63 917 000 0000',
            'notes' => 'Original notes',
        ]))
        ->assertRedirect();

    expect(AuditLog::query()->where('action', 'account.updated')->exists())->toBeFalse();
});

test('agency users cannot update staff accounts', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $staff = updateStaff(User::factory()->admin()->forAgency($user->agency)->create());

    $this->actingAs($user)
        ->put(route('dashboard.accounts.update', $staff), updatePayload())
        ->assertForbidden();

    expect($staff->fresh()->name)->not->toBe('Updated Name');
});
