<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Agency;
use App\Models\Employer;
use App\Models\JobCategory;
use App\Models\JobSubcategory;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\JobPostInput;

test('the create page contains only the agency pathway and active employers and enum options', function () {
    $agency = Agency::factory()->create(['pathway' => 'landbased']);
    $user = User::factory()->agency()->forAgency($agency)->create();
    $category = JobCategory::factory()->create(['pathway' => 'landbased']);
    $subcategory = JobSubcategory::factory()->for($category, 'category')->create();
    JobSubcategory::factory()->for($category, 'category')->create(['deleted_at' => now()]);
    JobCategory::factory()->create(['pathway' => 'seabased']);
    JobCategory::factory()->create(['pathway' => 'landbased', 'deleted_at' => now()]);
    $employer = Employer::factory()->for($agency)->create();
    Employer::factory()->for($agency)->create(['deleted_at' => now()]);
    Employer::factory()->create();

    $this->actingAs($user)->get('/dashboard/jobs/new')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('dashboard/jobs/new')->where('agency.id', $agency->id)
        ->has('categories', 1)->where('categories.0.id', $category->id)
        ->has('categories.0.subcategories', 1)->where('categories.0.subcategories.0.id', $subcategory->id)
        ->has('employers', 1)->where('employers.0.id', $employer->id)
        ->where('options.answer_types', ['yesno', 'short', 'selection', 'number'])
        ->hasAll(['options.currencies', 'options.contract_types', 'options.education_levels',
            'options.languages', 'options.proficiencies', 'options.genders', 'options.recruitment_types', 'options.answer_types', 'today']));
});

test('accounts without an agency cannot create job posts or employers', function (string $role) {
    $user = User::factory()->{$role}()->create();
    $this->actingAs($user)->get('/dashboard/jobs/new')->assertForbidden()->assertSee('Your account is not linked to an agency yet.');
    $this->post('/dashboard/jobs', [
        ...JobPostInput::for(User::factory()->agency()->forAgency(Agency::factory()->create())->create()),
    ])->assertForbidden()->assertJsonPath('message', 'Your account is not linked to an agency yet.');
    $this->post('/dashboard/employers', ['employer_name' => 'Acme', 'employer_location' => 'Riyadh', 'employer_license_number' => '123'])
        ->assertForbidden()->assertJsonPath('message', 'Your account is not linked to an agency yet.');
})->with(['agency', 'admin', 'superadmin']);

test('suspended or archived agencies cannot post', function (string $state) {
    $agency = Agency::factory()->create([$state => now()]);
    $user = User::factory()->agency()->forAgency($agency)->create();
    $validUser = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $input = JobPostInput::for($validUser);

    $this->actingAs($user)->get('/dashboard/jobs/new')->assertForbidden();
    $this->post('/dashboard/jobs', $input)->assertForbidden();
    $this->post('/dashboard/employers', ['employer_name' => 'Acme', 'employer_location' => 'Riyadh', 'employer_license_number' => '123'])->assertForbidden();
    $this->assertDatabaseCount('job_posts', 0);
    $this->assertDatabaseCount('employers', 0);
})->with(['suspended_at', 'deleted_at']);

test('all new endpoints retain authentication and dashboard permission middleware', function (string $method, string $url) {
    $this->{$method}($url)->assertRedirect(route('login'));
    $this->actingAs(User::factory()->applicant()->create())->{$method}($url)->assertRedirect(route('home', absolute: false));
    $user = User::factory()->create();
    $user->givePermissionTo('access dashboard');
    $this->actingAs($user)->{$method}($url)->assertForbidden();
})->with([
    ['get', '/dashboard/jobs/new'], ['post', '/dashboard/jobs'],
    ['post', '/dashboard/employers'], ['get', '/dashboard/jobs/duplicates'],
]);

test('create page query count is constant as picker data grows', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    JobPostInput::for($user);
    $this->actingAs($user)->get('/dashboard/jobs/new')->assertOk();
    DB::enableQueryLog();
    DB::flushQueryLog();
    $this->get('/dashboard/jobs/new')->assertOk();
    $small = count(DB::getQueryLog());
    JobCategory::factory()->has(JobSubcategory::factory()->count(3), 'subcategories')->count(5)->create(['pathway' => $user->agency->pathway]);
    Employer::factory()->for($user->agency)->count(10)->create();
    DB::flushQueryLog();
    $this->get('/dashboard/jobs/new')->assertOk();
    expect(count(DB::getQueryLog()))->toBe($small);
    DB::disableQueryLog();
});

test('permission denied initial form visits render an unavailable page with a safe toast', function () {
    $user = User::factory()->forAgency(Agency::factory()->create())->create();
    $user->givePermissionTo('access dashboard');

    $this->actingAs($user)->get('/dashboard/jobs/new')
        ->assertForbidden()->assertInertia(fn (Assert $page) => $page
        ->component('dashboard/jobs/unavailable')
        ->where('message', 'You do not have permission to manage job posts.')
        ->hasFlash('toast.type', 'error')
        ->hasFlash('toast.message', 'You do not have permission to manage job posts.'));
});

test('permission denied Inertia form visits return an Inertia page not a raw JSON error', function () {
    $user = User::factory()->forAgency(Agency::factory()->create())->create();
    $user->givePermissionTo('access dashboard');
    $version = app(HandleInertiaRequests::class)->version(Request::create('/dashboard/jobs/new'));

    $this->actingAs($user)->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => $version])->get('/dashboard/jobs/new')
        ->assertForbidden()->assertHeader('X-Inertia', 'true')
        ->assertJsonPath('component', 'dashboard/jobs/unavailable')
        ->assertJsonPath('props.message', 'You do not have permission to manage job posts.')
        ->assertJsonPath('flash.toast.type', 'error')
        ->assertJsonPath('flash.toast.message', 'You do not have permission to manage job posts.');
});
