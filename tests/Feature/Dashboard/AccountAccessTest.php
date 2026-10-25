<?php

use App\Models\Agency;
use App\Models\StaffProfile;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to login from the accounts page', function () {
    $this->get(route('dashboard.accounts'))->assertRedirect(route('login'));
});

test('applicants are redirected home from the accounts page', function () {
    $this->actingAs(User::factory()->applicant()->create())
        ->get(route('dashboard.accounts'))
        ->assertRedirect(route('home', absolute: false));
});

test('agency users cannot open the accounts page', function () {
    $this->actingAs(User::factory()->agency()->forAgency(Agency::factory()->create())->create())
        ->get(route('dashboard.accounts'))
        ->assertForbidden();
});

test('admins can open the accounts page and receive the management capability', function () {
    $this->actingAs(User::factory()->admin()->forAgency(Agency::factory()->create())->create())
        ->get(route('dashboard.accounts'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/accounts')
            ->where('canManageAccounts', true)
        );
});

test('superadmins with an all scope receive an empty accounts page without management capability', function () {
    $this->actingAs(User::factory()->superadmin()->create())
        ->get(route('dashboard.accounts'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/accounts')
            ->has('staff.data', 0)
            ->where('canManageAccounts', false)
            ->where('seats', ['used' => 0, 'limit' => 0])
        );
});

test('admins only see staff from their own agency', function () {
    $agency = Agency::factory()->create();
    $otherAgency = Agency::factory()->create();

    $admin = User::factory()->admin()->forAgency($agency)->create();
    $ownStaff = User::factory()->agency()->forAgency($agency)->create();
    $otherStaff = User::factory()->agency()->forAgency($otherAgency)->create();

    StaffProfile::factory()->for($ownStaff, 'user')->create(['employee_id' => 'OPAP-0001']);
    StaffProfile::factory()->for($otherStaff, 'user')->create(['employee_id' => 'OPAP-0002']);

    $this->actingAs($admin)
        ->get(route('dashboard.accounts'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('staff.data', 1)
            ->where('staff.data.0.id', $ownStaff->id)
        );
});

test('admins never see or change their own account or other roles', function () {
    $agency = Agency::factory()->create();
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $applicant = User::factory()->applicant()->create(['agency_id' => $agency->id]);

    $this->actingAs($admin)
        ->get(route('dashboard.accounts'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('staff.data', 0));

    $payload = [
        'name' => 'Changed', 'email' => 'changed@example.test',
        'employee_id' => 'OPAP-9999',
    ];

    $this->actingAs($admin)
        ->put(route('dashboard.accounts.update', $admin), $payload)
        ->assertNotFound();

    $this->actingAs($admin)
        ->put(route('dashboard.accounts.update', $applicant), $payload)
        ->assertNotFound();

    $this->actingAs($admin)
        ->patch(route('dashboard.accounts.status', $applicant), ['status' => 'suspended'])
        ->assertNotFound();
});

test('admins cannot update or suspend staff from another agency', function () {
    $agency = Agency::factory()->create();
    $otherAgency = Agency::factory()->create();
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $foreignStaff = User::factory()->agency()->forAgency($otherAgency)->create();

    StaffProfile::factory()->for($foreignStaff, 'user')->create();

    $this->actingAs($admin)
        ->put(route('dashboard.accounts.update', $foreignStaff), [
            'name' => 'Changed', 'email' => 'changed@example.test',
            'employee_id' => 'OPAP-1234',
        ])
        ->assertNotFound();

    $this->actingAs($admin)
        ->patch(route('dashboard.accounts.status', $foreignStaff), ['status' => 'suspended'])
        ->assertNotFound();

    expect($foreignStaff->fresh()->suspended_at)->toBeNull();
});

test('archived staff accounts are hidden and cannot be changed', function () {
    $agency = Agency::factory()->create();
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $archived = User::factory()->agency()->forAgency($agency)->create();
    $archived->delete();

    $this->actingAs($admin)
        ->get(route('dashboard.accounts'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('staff.data', 0));

    $this->actingAs($admin)
        ->patch(route('dashboard.accounts.status', $archived), ['status' => 'suspended'])
        ->assertNotFound();
});
