<?php

use App\Models\Agency;
use App\Models\Employer;
use App\Models\User;
use App\Repositories\Employer\EmployerRepository;
use Illuminate\Database\UniqueConstraintViolationException;

test('inline employers use session ownership and flash their id without replacing the form', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();

    $response = $this->actingAs($user)->from('/dashboard/jobs/new')->post('/dashboard/employers', [
        'employer_name' => '  Acme  ', 'employer_location' => '  Riyadh  ',
        'employer_license_number' => '  LIC-123  ', 'agency_id' => 99999,
    ])->assertRedirect('/dashboard/jobs/new')
        ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Employer added.'])
        ->assertInertiaFlash('createdEmployer.id');
    $response->assertInertiaFlash('createdEmployer.id', Employer::sole()->id);

    $this->assertDatabaseHas('employers', [
        'agency_id' => $user->agency_id, 'employer_name' => 'Acme',
        'employer_location' => 'Riyadh', 'employer_license_number' => 'LIC-123',
    ]);
});

test('employer names are case insensitive and unique only within an active agency set', function () {
    $agency = Agency::factory()->create();
    $user = User::factory()->agency()->forAgency($agency)->create();
    Employer::factory()->for($agency)->create(['employer_name' => 'Acme']);
    $input = ['employer_name' => ' ACME ', 'employer_location' => 'Riyadh', 'employer_license_number' => 'LIC-123'];

    $this->actingAs($user)->from('/dashboard/jobs/new')->post('/dashboard/employers', $input)
        ->assertRedirect('/dashboard/jobs/new')->assertSessionHasErrors('employer_name')
        ->assertInertiaFlash('toast.message', 'An employer with this name already exists in your agency.');
    $this->assertDatabaseCount('employers', 1);

    $otherUser = User::factory()->admin()->forAgency(Agency::factory()->create())->create();
    $this->actingAs($otherUser)->from('/dashboard/jobs/new')->post('/dashboard/employers', $input)->assertSessionHasNoErrors();
    $this->assertDatabaseCount('employers', 2);
    Employer::where('agency_id', $agency->id)->firstOrFail()->delete();
    $this->actingAs($user)->post('/dashboard/employers', $input)->assertSessionHasNoErrors();
    expect(Employer::where('agency_id', $agency->id)->count())->toBe(1);
});

test('employer validation returns field errors and a summary toast', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $this->actingAs($user)->from('/dashboard/jobs/new')->post('/dashboard/employers', [])
        ->assertSessionHasErrors(['employer_name', 'employer_location', 'employer_license_number'])
        ->assertInertiaFlash('toast.message', 'Please fix the highlighted fields.');
    $this->assertDatabaseCount('employers', 0);
});

test('a unique index race returns the same friendly duplicate employer error', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $this->partialMock(EmployerRepository::class)->shouldReceive('create')->once()->andThrow(
        new UniqueConstraintViolationException('sqlite', 'insert into employers', [], new RuntimeException('private constraint details')),
    );

    $this->actingAs($user)->from('/dashboard/jobs/new')->post('/dashboard/employers', [
        'employer_name' => 'Acme', 'employer_location' => 'Riyadh', 'employer_license_number' => 'LIC-123',
    ])->assertRedirect('/dashboard/jobs/new')->assertSessionHasErrors('employer_name')
        ->assertInertiaFlash('toast.message', 'An employer with this name already exists in your agency.');
    $this->assertDatabaseCount('employers', 0);
});
