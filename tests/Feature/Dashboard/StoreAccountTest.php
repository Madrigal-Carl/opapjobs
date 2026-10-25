<?php

use App\Enums\Role;
use App\Events\StaffAccountCreated;
use App\Models\Agency;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Support\Facades\Event;

function storeAdmin(array $agencyAttributes = []): User
{
    return User::factory()->admin()->forAgency(Agency::factory()->create($agencyAttributes))->create();
}

function storePayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'New Staff',
        'email' => 'new.staff@example.test',
        'employee_id' => 'OPAP-1000',
        'phone' => '+63 917 123 4567',
        'notes' => 'Handles placements.',
    ], $overrides);
}

test('an admin can add a staff account for their own agency', function () {
    Event::fake([StaffAccountCreated::class]);

    $admin = storeAdmin();
    $otherAgency = Agency::factory()->create();

    $this->actingAs($admin)
        ->from(route('dashboard.accounts'))
        ->post(route('dashboard.accounts.store'), storePayload(['agency_id' => $otherAgency->id]))
        ->assertRedirect(route('dashboard.accounts'))
        ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Staff account added.']);

    $staff = User::query()->where('email', 'new.staff@example.test')->sole();

    expect($staff->agency_id)->toBe($admin->agency_id)
        ->and($staff->created_by_user_id)->toBe($admin->id)
        ->and($staff->email_verified_at)->not->toBeNull()
        ->and($staff->hasRole(Role::Agency->value))->toBeTrue()
        ->and($staff->getRoleNames()->all())->toBe([Role::Agency->value])
        ->and($staff->staffProfile?->employee_id)->toBe('OPAP-1000')
        ->and($staff->staffProfile?->phone)->toBe('+63 917 123 4567')
        ->and($staff->staffProfile?->notes)->toBe('Handles placements.');

    Event::assertDispatched(StaffAccountCreated::class, fn (StaffAccountCreated $event): bool => $event->user->is($staff));
});

test('the email is stored lowercased and trimmed', function () {
    $admin = storeAdmin();

    $this->actingAs($admin)
        ->post(route('dashboard.accounts.store'), storePayload(['email' => '  MiXeD@Example.Test  ']))
        ->assertRedirect();

    expect(User::query()->where('email', 'mixed@example.test')->exists())->toBeTrue();
});

test('payload agency and role values are ignored', function () {
    $admin = storeAdmin();
    $otherAgency = Agency::factory()->create();

    $this->actingAs($admin)
        ->post(route('dashboard.accounts.store'), storePayload([
            'agency_id' => $otherAgency->id,
            'role' => Role::Superadmin->value,
            'roles' => [Role::Superadmin->value],
        ]))
        ->assertRedirect();

    $staff = User::query()->where('email', 'new.staff@example.test')->sole();

    expect($staff->agency_id)->toBe($admin->agency_id)
        ->and($staff->hasRole(Role::Superadmin->value))->toBeFalse()
        ->and($staff->hasRole(Role::Agency->value))->toBeTrue();
});

test('the seat limit counts existing non-archived staff and blocks new accounts', function () {
    $admin = storeAdmin(['agency_user_limit' => 1]);
    User::factory()->agency()->forAgency($admin->agency)->create();

    $this->actingAs($admin)
        ->from(route('dashboard.accounts'))
        ->post(route('dashboard.accounts.store'), storePayload())
        ->assertRedirect(route('dashboard.accounts'))
        ->assertInertiaFlash('toast', [
            'type' => 'error',
            'message' => 'You have reached the staff seat limit for this agency.',
        ]);

    expect(User::query()->where('email', 'new.staff@example.test')->exists())->toBeFalse();
});

test('the seat limit allows the last free seat', function () {
    $admin = storeAdmin(['agency_user_limit' => 2]);
    User::factory()->agency()->forAgency($admin->agency)->create();

    $this->actingAs($admin)
        ->post(route('dashboard.accounts.store'), storePayload())
        ->assertRedirect();

    expect(User::query()->where('email', 'new.staff@example.test')->exists())->toBeTrue();
});

test('suspended staff still consume a seat', function () {
    $admin = storeAdmin(['agency_user_limit' => 1]);
    User::factory()->agency()->forAgency($admin->agency)->suspended()->create();

    $this->actingAs($admin)
        ->from(route('dashboard.accounts'))
        ->post(route('dashboard.accounts.store'), storePayload())
        ->assertRedirect(route('dashboard.accounts'))
        ->assertInertiaFlash('toast.message', 'You have reached the staff seat limit for this agency.');
});

test('archived staff do not consume a seat', function () {
    $admin = storeAdmin(['agency_user_limit' => 1]);
    User::factory()->agency()->forAgency($admin->agency)->create()->delete();

    $this->actingAs($admin)
        ->post(route('dashboard.accounts.store'), storePayload())
        ->assertRedirect();

    expect(User::query()->where('email', 'new.staff@example.test')->exists())->toBeTrue();
});

test('an archived existing email is rejected', function () {
    $admin = storeAdmin();
    $existing = User::factory()->agency()->create(['email' => 'gone@example.test']);
    $existing->delete();

    $this->actingAs($admin)
        ->post(route('dashboard.accounts.store'), storePayload(['email' => 'gone@example.test']))
        ->assertSessionHasErrors('email');
});

test('an email already used by another active user is rejected', function () {
    $admin = storeAdmin();
    User::factory()->agency()->create(['email' => 'Taken@Example.test']);

    $this->actingAs($admin)
        ->from(route('dashboard.accounts'))
        ->post(route('dashboard.accounts.store'), storePayload(['email' => 'taken@example.test']))
        ->assertRedirect(route('dashboard.accounts'))
        ->assertSessionHasErrors('email')
        ->assertInertiaFlash('toast.message', 'Please fix the highlighted fields.');
});

test('employee ids are unique per agency ignoring case', function () {
    $admin = storeAdmin();
    $colleague = User::factory()->agency()->forAgency($admin->agency)->create();
    StaffProfile::factory()->for($colleague, 'user')->create(['employee_id' => 'OPAP-4321']);

    $this->actingAs($admin)
        ->from(route('dashboard.accounts'))
        ->post(route('dashboard.accounts.store'), storePayload(['employee_id' => 'opap-4321']))
        ->assertSessionHasErrors('employee_id')
        ->assertInertiaFlash('toast.message', 'Please fix the highlighted fields.');
});

test('archived staff employee ids can be reused', function () {
    $admin = storeAdmin();
    $archived = User::factory()->agency()->forAgency($admin->agency)->create();
    StaffProfile::factory()->for($archived, 'user')->create(['employee_id' => 'OPAP-4321']);
    $archived->delete();

    $this->actingAs($admin)
        ->post(route('dashboard.accounts.store'), storePayload(['employee_id' => 'OPAP-4321']))
        ->assertRedirect();

    expect(User::query()->where('email', 'new.staff@example.test')->exists())->toBeTrue();
});

test('the same employee id can be used by another agency', function () {
    $admin = storeAdmin();
    $otherAgency = Agency::factory()->create();
    $foreign = User::factory()->agency()->forAgency($otherAgency)->create();
    StaffProfile::factory()->for($foreign, 'user')->create(['employee_id' => 'OPAP-4321']);

    $this->actingAs($admin)
        ->post(route('dashboard.accounts.store'), storePayload(['employee_id' => 'OPAP-4321']))
        ->assertRedirect();

    expect(User::query()->where('email', 'new.staff@example.test')->exists())->toBeTrue();
});

test('storing a staff account validates the submitted fields', function (string $field, mixed $value) {
    $admin = storeAdmin();

    $this->actingAs($admin)
        ->from(route('dashboard.accounts'))
        ->post(route('dashboard.accounts.store'), storePayload([$field => $value]))
        ->assertRedirect(route('dashboard.accounts'))
        ->assertSessionHasErrors($field)
        ->assertInertiaFlash('toast.message', 'Please fix the highlighted fields.');

    expect(User::query()->where('email', 'new.staff@example.test')->exists())->toBeFalse();
})->with([
    'missing name' => ['name', ''],
    'missing email' => ['email', ''],
    'invalid email' => ['email', 'not-an-email'],
    'missing employee id' => ['employee_id', ''],
    'long employee id' => ['employee_id', str_repeat('x', 51)],
    'long name' => ['name', str_repeat('x', 256)],
    'letters in phone' => ['phone', 'call me'],
    'long notes' => ['notes', str_repeat('x', 1001)],
]);

test('agency users cannot add staff accounts', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();

    $this->actingAs($user)
        ->post(route('dashboard.accounts.store'), storePayload())
        ->assertForbidden();

    expect(User::query()->where('email', 'new.staff@example.test')->exists())->toBeFalse();
});
