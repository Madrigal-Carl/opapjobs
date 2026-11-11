<?php

use App\Models\Agency;
use App\Models\JobPost;
use App\Models\StaffProfile;
use App\Models\User;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

function accountAdmin(Agency $agency): User
{
    return User::factory()->admin()->forAgency($agency)->create();
}

function accountStaff(User $admin, array $attributes = [], array $profile = []): User
{
    $staff = User::factory()->agency()->forAgency($admin->agency)->create($attributes);

    StaffProfile::factory()->for($staff, 'user')->create($profile);

    return $staff;
}

test('the accounts page returns filtered staff rows with meta and seats', function () {
    $agency = Agency::factory()->create(['agency_user_limit' => 5]);
    $admin = accountAdmin($agency);
    $active = accountStaff($admin, ['name' => 'Maria Santos', 'email' => 'maria@example.test']);
    $suspended = accountStaff($admin, ['name' => 'Jose Rizal', 'email' => 'jose@example.test']);
    $suspended->forceFill(['suspended_at' => now()])->save();

    $this->actingAs($admin)
        ->get(route('dashboard.accounts'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/accounts')
            ->has('staff.data', 2)
            ->where('staff.meta.total', 2)
            ->where('staff.meta.per_page', 10)
            ->where('filters', ['q' => null, 'status' => null, 'per_page' => 10])
            ->where('seats', ['used' => 2, 'limit' => 5])
            ->missing('kpis')
            ->loadDeferredProps(fn (Assert $reload) => $reload
                ->where('kpis', [
                    'total_staff' => 2, 'active' => 1, 'suspended' => 1, 'jobs_created' => 0,
                ])
            )
        );
});

test('staff rows expose only the safe fields', function () {
    $agency = Agency::factory()->create();
    $admin = accountAdmin($agency);
    $staff = accountStaff($admin, ['name' => 'Ana Cruz', 'email' => 'ana@example.test'], [
        'phone' => '+63 917 123 4567', 'notes' => 'Morning shift',
    ]);

    $this->actingAs($admin)
        ->get(route('dashboard.accounts'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('staff.data', 1)
            ->where('staff.data.0', [
                'id' => $staff->id,
                'name' => 'Ana Cruz',
                'email' => 'ana@example.test',
                'phone' => '+63 917 123 4567',
                'notes' => 'Morning shift',
                'status' => 'active',
                'jobs_created' => 0,
                'last_login_at' => null,
                'created_at' => $staff->created_at?->toIso8601String(),
            ])
        );
});

test('the search matches name and email case insensitively', function (string $term, string $expected) {
    $agency = Agency::factory()->create();
    $admin = accountAdmin($agency);
    $maria = accountStaff($admin, ['name' => 'Maria Santos', 'email' => 'maria@example.test']);
    accountStaff($admin, ['name' => 'Jose Rizal', 'email' => 'jose@example.test']);

    $this->actingAs($admin)
        ->get(route('dashboard.accounts', ['q' => $term]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('staff.data', 1)
            ->where('staff.data.0.id', $maria->id)
            ->where('filters.q', $expected)
        );
})->with([
    'name' => ['MARIA', 'MARIA'],
    'email' => ['MARIA@EXAMPLE', 'MARIA@EXAMPLE'],
]);

test('the status filter only returns matching accounts', function (string $status, bool $expectSuspended) {
    $agency = Agency::factory()->create();
    $admin = accountAdmin($agency);
    $active = accountStaff($admin, ['name' => 'Active Account']);
    $suspended = accountStaff($admin, ['name' => 'Suspended Account']);
    $suspended->forceFill(['suspended_at' => now()])->save();

    $expected = $expectSuspended ? $suspended : $active;

    $this->actingAs($admin)
        ->get(route('dashboard.accounts', ['status' => $status]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('staff.data', 1)
            ->where('staff.data.0.id', $expected->id)
            ->where('filters.status', $status)
        );
})->with([
    'active' => ['active', false],
    'suspended' => ['suspended', true],
]);

test('the accounts pagination respects the page size and page parameter', function () {
    $agency = Agency::factory()->create();
    $admin = accountAdmin($agency);

    foreach (range(1, 12) as $index) {
        accountStaff($admin, ['name' => "Staff {$index}"]);
    }

    $this->actingAs($admin)
        ->get(route('dashboard.accounts', ['per_page' => 10, 'page' => 2]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('staff.data', 2)
            ->where('staff.meta.current_page', 2)
            ->where('staff.meta.last_page', 2)
            ->where('staff.meta.total', 12)
        );

    $this->actingAs($admin)
        ->get(route('dashboard.accounts', ['per_page' => 25]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('staff.data', 12)
            ->where('filters.per_page', 25)
        );
});

test('the accounts page rejects invalid query parameters', function (string $parameter, mixed $value) {
    $admin = accountAdmin(Agency::factory()->create());

    $this->actingAs($admin)
        ->get(route('dashboard.accounts', [$parameter => $value]))
        ->assertRedirect(route('dashboard.accounts'))
        ->assertSessionHasErrors($parameter);
})->with([
    'invalid page size' => ['per_page', 20],
    'oversized page size' => ['per_page', 100],
    'long search' => ['q', str_repeat('x', 101)],
    'array search' => ['q', ['test']],
    'invalid status' => ['status', 'archived'],
    'zero page' => ['page', 0],
    'fractional page' => ['page', 1.5],
]);

test('jobs created is derived from the staff member job posts', function () {
    $agency = Agency::factory()->create();
    $admin = accountAdmin($agency);
    $staff = accountStaff($admin);

    JobPost::factory()->forPoster($staff)->count(3)->create();

    $this->actingAs($admin)
        ->get(route('dashboard.accounts'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('staff.data.0.jobs_created', 3)
        );

    $this->actingAs($admin)
        ->get(route('dashboard.accounts'))
        ->assertInertia(fn (Assert $page) => $page->loadDeferredProps(fn (Assert $reload) => $reload
            ->where('kpis.jobs_created', 3)
        ));
});

test('the accounts page is ordered by most recent creation', function () {
    $agency = Agency::factory()->create();
    $admin = accountAdmin($agency);

    CarbonImmutable::setTestNow('2026-01-01 09:00:00');
    $older = accountStaff($admin, ['name' => 'Older Staff']);
    CarbonImmutable::setTestNow('2026-01-02 09:00:00');
    $newer = accountStaff($admin, ['name' => 'Newer Staff']);
    CarbonImmutable::setTestNow();

    $this->actingAs($admin)
        ->get(route('dashboard.accounts'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('staff.data.0.id', $newer->id)
            ->where('staff.data.1.id', $older->id)
        );
});
