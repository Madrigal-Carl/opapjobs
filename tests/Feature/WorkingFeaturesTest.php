<?php

use App\Enums\Pathway;
use App\Events\StaffAccountCreated;
use App\Models\Agency;
use App\Models\Application;
use App\Models\Employer;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\JobPostInput;
use Tests\Support\PublicCatalog;

/**
 * Where the backend meets the frontend, across features: every page reaches a
 * React component that exists (`inertia.testing.ensure_pages_exist` fails the
 * request otherwise), and each working flow is followed from the screen that
 * writes the data to the screen that reads it. The rules of a single endpoint
 * stay in that endpoint's own test file.
 */

/**
 * Every page, as [route, who opens it, React component, route parameters].
 * The route `id`s below match no record: the page renders its not-found state.
 */
$pages = [
    'home' => ['home', 'guest', 'home'],
    'agency directory' => ['agencies.index', 'guest', 'agencies/index'],
    'jobs' => ['jobs.index', 'guest', 'jobs/index'],
    'job profile' => ['jobs.show', 'guest', 'jobs/show', ['job' => '999999']],
    'contact' => ['contact', 'guest', 'contact'],

    'login' => ['login', 'guest', 'auth/login'],
    'register' => ['register', 'guest', 'auth/register'],
    'forgot password' => ['password.request', 'guest', 'auth/forgot-password'],
    'reset password' => ['password.reset', 'guest', 'auth/reset-password', ['token' => 'token', 'email' => 'a@example.test']],
    'verify email' => ['verification.notice', 'unverified', 'auth/verify-email'],
    'confirm password' => ['password.confirm', 'applicant', 'auth/confirm-password'],

    'agency profile' => ['agencies.show', 'applicant', 'agencies/show', ['slug' => 'no-such-agency']],
    'apply' => ['jobs.apply', 'applicant', 'jobs/apply', ['job' => '999999']],
    'resume' => ['resume', 'applicant', 'applicant/resume'],
    'my jobs' => ['applications', 'applicant', 'applicant/applications'],

    'hiring overview' => ['dashboard.overview', 'agency', 'dashboard/overview/hiring'],
    'dashboard jobs' => ['dashboard.jobs', 'agency', 'dashboard/jobs'],
    'new job post' => ['dashboard.jobs.create', 'agency', 'dashboard/jobs/new'],
    'dashboard applications' => ['dashboard.applications', 'agency', 'dashboard/applications'],
    'candidates' => ['dashboard.candidates', 'agency', 'dashboard/candidates'],
    'accounts' => ['dashboard.accounts', 'admin', 'dashboard/accounts'],
    'profile settings' => ['profile.edit', 'admin', 'settings/profile'],
    'security settings' => ['security.edit', 'admin', 'settings/security'],

    'console agencies' => ['dashboard.system.agencies', 'superadmin', 'dashboard/system/agencies/index'],
    'console new agency' => ['dashboard.system.agencies.create', 'superadmin', 'dashboard/system/agencies/create'],
    'console agency' => ['dashboard.system.agencies.show', 'superadmin', 'dashboard/system/agencies/show', ['agency' => 'any']],
    'console accounts' => ['dashboard.system.accounts', 'superadmin', 'dashboard/system/accounts'],
    'console job posts' => ['dashboard.system.job-posts', 'superadmin', 'dashboard/system/job-posts/index'],
    'console new job post' => ['dashboard.system.job-posts.create', 'superadmin', 'dashboard/system/job-posts/create'],
    'console job post' => ['dashboard.system.job-posts.show', 'superadmin', 'dashboard/system/job-posts/show', ['jobPost' => 'any']],
    'console applications' => ['dashboard.system.applications', 'superadmin', 'dashboard/system/applications'],
    'console applicants' => ['dashboard.system.applicants', 'superadmin', 'dashboard/system/applicants/index'],
    'console applicant' => ['dashboard.system.applicants.show', 'superadmin', 'dashboard/system/applicants/show', ['applicant' => 'any']],
    'console reviews' => ['dashboard.system.reviews', 'superadmin', 'dashboard/system/reviews'],
    'console categories' => ['dashboard.system.categories', 'superadmin', 'dashboard/system/categories'],
    'console fields' => ['dashboard.system.fields', 'superadmin', 'dashboard/system/fields'],
    'console content' => ['dashboard.system.content', 'superadmin', 'dashboard/system/content'],
    'console audit log' => ['dashboard.system.audit-log', 'superadmin', 'dashboard/system/audit-log'],
];

/** GET routes of this application that are no plain page, and where they are exercised. */
$notPlainPages = [
    'dashboard.system.overview', // not working yet: the route renders a React page that does not exist
    'dashboard.system.settings', // not working yet: the route renders a React page that does not exist
    'dashboard', // redirects by role: RedirectControllerTest
    'dashboard.jobs.duplicates', // JSON: JobPostDuplicatesTest
    'dashboard.jobs.edit', // needs a record: the job post flow below
    'dashboard.applications.show', // needs a record: the application flow below
    'dashboard.applications.documents', // a file download: ApplicationShowTest
];

$consolePages = array_values(array_filter($pages, fn (array $page): bool => $page[1] === 'superadmin'));

function workingFeaturesUser(string $who): ?User
{
    return match ($who) {
        'guest' => null,
        'unverified' => User::factory()->applicant()->unverified()->create(),
        'applicant' => User::factory()->applicant()->create(),
        'agency' => User::factory()->agency()->forAgency(Agency::factory()->create())->create(),
        'admin' => User::factory()->admin()->forAgency(Agency::factory()->create())->create(),
        'superadmin' => User::factory()->superadmin()->create(),
    };
}

/** @return list<string> Titles the public jobs page shows for a query. */
function workingFeaturesPublicTitles(mixed $test, array $query = []): array
{
    app('auth')->forgetGuards();

    return collect($test->get(route('jobs.index', $query))->inertiaProps('jobPosts'))->pluck('title')->all();
}

test('the page opens on its react component', function (string $route, string $who, string $component, array $parameters = []) {
    $user = workingFeaturesUser($who);

    if ($user !== null) {
        $this->actingAs($user);
    }

    $this->withSession(['auth.password_confirmed_at' => time()])
        ->get(route($route, $parameters))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component($component));
})->with($pages);

test('every page of the application is on the list above', function () use ($pages, $notPlainPages) {
    $listed = [...array_column($pages, 0), ...$notPlainPages];

    $missing = collect(Route::getRoutes()->getRoutes())
        ->filter(fn (RoutingRoute $route): bool => in_array('GET', $route->methods(), true)
            && str_starts_with($route->getActionName(), 'App\\Http\\Controllers\\')
            && $route->getName() !== null)
        ->map(fn (RoutingRoute $route): string => $route->getName())
        ->diff($listed)
        ->values()
        ->all();

    expect($missing)->toBe([]);
});

test('the super admin console is closed to guests', function (string $route, string $who, string $component, array $parameters = []) {
    $this->get(route($route, $parameters))->assertRedirect(route('login'));
})->with($consolePages);

test('the super admin console is closed to agency staff', function (string $route, string $who, string $component, array $parameters = []) {
    $this->actingAs(workingFeaturesUser('agency'))->get(route($route, $parameters))->assertForbidden();
})->with($consolePages);

test('the console detail pages receive the id from the url', function (string $route, string $parameter, string $prop) {
    $this->actingAs(workingFeaturesUser('superadmin'))
        ->get(route($route, [$parameter => 'record-7']))
        ->assertInertia(fn (Assert $page) => $page->where($prop, 'record-7'));
})->with([
    'agency' => ['dashboard.system.agencies.show', 'agency', 'agencyId'],
    'job post' => ['dashboard.system.job-posts.show', 'jobPost', 'jobPostId'],
    'applicant' => ['dashboard.system.applicants.show', 'applicant', 'applicantId'],
]);

test('a job post published from the dashboard reaches the public pages until it is closed or archived', function () {
    $agency = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Northwind Manpower']);
    $staff = User::factory()->agency()->forAgency($agency)->create();
    $input = JobPostInput::for($staff);

    $this->actingAs($staff)->post(route('dashboard.jobs.store'), $input)->assertRedirect(route('dashboard.jobs'));
    $post = JobPost::query()->where('job_title', 'Electrician')->sole();

    $this->get(route('dashboard.jobs'))->assertInertia(fn (Assert $page) => $page
        ->has('jobPosts.data', 1)
        ->where('jobPosts.data.0.job_title', 'Electrician')
        ->where('canManageJobs', true));

    expect(workingFeaturesPublicTitles($this))->toBe(['Electrician']);
    $this->get(route('jobs.show', $post->id))->assertInertia(fn (Assert $page) => $page
        ->where('jobPost.title', 'Electrician')
        ->where('agency.name', 'Northwind Manpower'));
    $this->get(route('agencies.index', ['country' => 'Saudi Arabia']))->assertInertia(fn (Assert $page) => $page
        ->has('agencies.items', 1)
        ->where('countryOptions', ['Saudi Arabia']));
    $this->get(route('home'))->assertOk();

    $this->actingAs($staff)->get(route('dashboard.jobs.edit', $post->id))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->component('dashboard/jobs/new'));
    $this->put(route('dashboard.jobs.update', $post->id), [...$input, 'job_title' => 'Master Electrician'])
        ->assertRedirect(route('dashboard.jobs'));
    expect(workingFeaturesPublicTitles($this))->toBe(['Master Electrician']);

    $this->actingAs($staff)->patch(route('dashboard.jobs.status', $post->id))
        ->assertInertiaFlash('toast.message', 'Job post closed.');
    expect(workingFeaturesPublicTitles($this))->toBe([]);
    $this->get(route('jobs.show', $post->id))->assertInertia(fn (Assert $page) => $page->where('jobPost', null));
    $this->get(route('agencies.index', ['country' => 'Saudi Arabia']))->assertInertia(fn (Assert $page) => $page
        ->has('agencies.items', 0)
        ->where('countryOptions', []));

    $this->actingAs($staff)->patch(route('dashboard.jobs.status', $post->id))
        ->assertInertiaFlash('toast.message', 'Job post opened.');
    expect(workingFeaturesPublicTitles($this))->toBe(['Master Electrician']);

    $this->actingAs($staff)->patch(route('dashboard.jobs.archive', $post->id))
        ->assertInertiaFlash('toast.message', 'Job post archived.');
    expect(workingFeaturesPublicTitles($this))->toBe([]);
});

test('an employer added from the dashboard is named on a job order and hidden on manpooling', function () {
    $agency = PublicCatalog::agency(Pathway::Landbased);
    $staff = User::factory()->agency()->forAgency($agency)->create();

    $this->actingAs($staff)->post(route('dashboard.employers.store'), [
        'employer_name' => 'Doha Clinic', 'employer_location' => 'Doha, Qatar', 'employer_license_number' => 'LIC-77',
    ])->assertSessionHasNoErrors();
    $employer = Employer::query()->where('employer_name', 'Doha Clinic')->sole();

    $this->get(route('dashboard.jobs.create'))->assertInertia(fn (Assert $page) => $page
        ->has('employers', 1)
        ->where('employers.0.id', $employer->id));

    $this->post(route('dashboard.jobs.store'), [...JobPostInput::for($staff), 'job_title' => 'Staff Nurse', 'employer_id' => $employer->id])
        ->assertSessionHasNoErrors();
    $this->post(route('dashboard.jobs.store'), [
        ...JobPostInput::for($staff), 'job_title' => 'Ward Aide', 'recruitment_type' => 'manpooling', 'job_order_number' => null,
        'employer_id' => $employer->id, 'work_location' => 'Secret Plant, Al Khor, Qatar',
    ])->assertSessionHasNoErrors();

    app('auth')->forgetGuards();
    $jobOrder = JobPost::query()->where('job_title', 'Staff Nurse')->sole();
    $manpooling = JobPost::query()->where('job_title', 'Ward Aide')->sole();

    $this->get(route('jobs.show', $jobOrder->id))->assertInertia(fn (Assert $page) => $page
        ->where('jobPost.employer', 'Doha Clinic')
        ->where('jobPost.employerDetails.licenseNumber', 'LIC-77'));

    $page = $this->get(route('jobs.show', $manpooling->id));
    $page->assertInertia(fn (Assert $assert) => $assert
        ->where('jobPost.location', 'Qatar')
        ->where('jobPost.employerDetails', null));
    expect(json_encode($page->inertiaProps('jobPost')))
        ->not->toContain('Doha Clinic')
        ->not->toContain('Secret Plant');
});

test('the jobs page answers each filter pill, alone and combined', function (array $filters, array $selected, array $expected) {
    $land = PublicCatalog::agency(Pathway::Landbased);
    $sea = PublicCatalog::agency(Pathway::Seabased);
    PublicCatalog::post($land, ['job_title' => 'Land urgent recent', 'is_urgent' => true]);
    PublicCatalog::post($land, ['job_title' => 'Land old', 'is_urgent' => false, 'created_at' => now()->subMonth()]);
    PublicCatalog::post($sea, ['job_title' => 'Sea urgent old', 'is_urgent' => true, 'created_at' => now()->subMonth()]);
    PublicCatalog::post($sea, ['job_title' => 'Sea recent', 'is_urgent' => false]);

    $response = $this->get(route('jobs.index', ['filters' => $filters]));

    expect(collect($response->inertiaProps('jobPosts'))->pluck('title')->sort()->values()->all())->toBe($expected)
        ->and($response->inertiaProps('filters.filters'))->toBe($selected)
        ->and($response->inertiaProps('jobPostsMeta.total'))->toBe(count($expected));
})->with([
    'landbased by default' => [[], ['landbased'], ['Land old', 'Land urgent recent']],
    'landbased' => [['landbased'], ['landbased'], ['Land old', 'Land urgent recent']],
    'seabased' => [['seabased'], ['seabased'], ['Sea recent', 'Sea urgent old']],
    'urgent on the default pathway' => [['urgent'], ['landbased', 'urgent'], ['Land urgent recent']],
    'recent on the default pathway' => [['recent'], ['landbased', 'recent'], ['Land urgent recent']],
    'seabased and urgent' => [['seabased', 'urgent'], ['seabased', 'urgent'], ['Sea urgent old']],
    'seabased and recent' => [['seabased', 'recent'], ['seabased', 'recent'], ['Sea recent']],
    'all that combine' => [['seabased', 'urgent', 'recent'], ['seabased', 'urgent', 'recent'], []],
]);

test('an application moves through hiring and the applicant and the public pages follow', function () {
    $agency = PublicCatalog::agency(Pathway::Landbased);
    $post = PublicCatalog::post($agency, ['job_title' => 'Electrician']);
    $staff = $post->poster;
    $applicant = User::factory()->applicant()->create();
    $application = Application::factory()->for($post, 'jobPost')->pending()->create(['applicant_user_id' => $applicant->id]);
    $rejected = Application::factory()->for($post, 'jobPost')->pending()->create();

    $this->actingAs($staff)->get(route('dashboard.applications'))->assertInertia(fn (Assert $page) => $page->has('applications.data', 2));
    $this->get(route('dashboard.applications.show', $application))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->component('dashboard/applications/show'));

    $this->actingAs($applicant)->get(route('applications'))->assertInertia(fn (Assert $page) => $page
        ->has('applied', 1)
        ->where('applied.0.title', 'Electrician')
        ->where('applied.0.applicationStage', 'pending'));

    foreach (range(1, 4) as $step) {
        $this->actingAs($staff)->patch(route('dashboard.applications.proceed', $application))->assertSessionHasNoErrors();
    }
    $this->patch(route('dashboard.applications.reject', $rejected), ['reason' => 'Position filled.'])->assertSessionHasNoErrors();

    expect($rejected->fresh()->stage->value)->toBe('rejected');

    $this->actingAs($applicant)->get(route('applications'))->assertInertia(fn (Assert $page) => $page
        ->where('applied.0.applicationStage', 'hired'));
    $this->get(route('jobs.show', $post->id))->assertInertia(fn (Assert $page) => $page
        ->where('agency.hiredCount', 1)
        ->where('agency.topHirer', true));
});

test('an admin manages a staff account from adding it to removing it', function () {
    Event::fake([StaffAccountCreated::class]);
    $admin = workingFeaturesUser('admin');
    $payload = ['name' => 'New Staff', 'email' => 'new.staff@example.test', 'phone' => '+63 917 123 4567', 'notes' => null];

    $this->actingAs($admin)->from(route('dashboard.accounts'))->post(route('dashboard.accounts.store'), $payload)
        ->assertInertiaFlash('toast.message', 'Staff account added.');
    $staff = User::query()->where('email', 'new.staff@example.test')->sole();

    $row = fn () => collect($this->get(route('dashboard.accounts'))->inertiaProps('staff.data'))->firstWhere('id', $staff->id);

    expect($row())->toMatchArray(['name' => 'New Staff', 'status' => 'active']);

    $this->put(route('dashboard.accounts.update', $staff), [...$payload, 'name' => 'Renamed Staff'])->assertSessionHasNoErrors();
    expect($row()['name'])->toBe('Renamed Staff');

    $this->patch(route('dashboard.accounts.status', $staff), ['status' => 'suspended'])->assertSessionHasNoErrors();
    expect($row()['status'])->toBe('suspended');

    $this->patch(route('dashboard.accounts.status', $staff), ['status' => 'active'])->assertSessionHasNoErrors();
    expect($row()['status'])->toBe('active');

    $this->patch(route('dashboard.accounts.archive', $staff))->assertSessionHasNoErrors();
    expect($row())->toBeNull();
});

test('a new applicant registers, verifies, signs out and signs back in', function () {
    Notification::fake();

    $this->post(route('register.store'), [
        'name' => 'Maria Santos', 'email' => 'maria@example.test', 'password' => 'password', 'password_confirmation' => 'password',
    ])->assertRedirect(route('verification.notice'));
    $user = User::query()->where('email', 'maria@example.test')->sole();

    $this->get(route('resume'))->assertRedirect(route('verification.notice'));

    $this->get(URL::temporarySignedRoute('verification.verify', now()->addHour(), [
        'id' => $user->id, 'hash' => sha1($user->email),
    ]))->assertRedirect();

    $this->get(route('resume'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('applicant/resume')
        ->where('auth.user.email', 'maria@example.test'));

    $this->post(route('logout'))->assertRedirect();
    $this->assertGuest();
    $this->get(route('resume'))->assertRedirect(route('login'));

    $this->post(route('login.store'), ['email' => 'maria@example.test', 'password' => 'password'])->assertRedirect();
    $this->assertAuthenticatedAs($user);
});

test('staff change their profile and password from settings and can sign in with the new one', function () {
    $admin = workingFeaturesUser('admin');

    $this->actingAs($admin)->patch(route('profile.update'), ['name' => 'Renamed Admin', 'email' => $admin->email])
        ->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));
    $this->get(route('profile.edit'))->assertInertia(fn (Assert $page) => $page->where('auth.user.name', 'Renamed Admin'));

    $this->from(route('security.edit'))->put(route('user-password.update'), [
        'current_password' => 'password', 'password' => 'a-new-Passw0rd!', 'password_confirmation' => 'a-new-Passw0rd!',
    ])->assertSessionHasNoErrors();

    $this->post(route('logout'));
    $this->post(route('login.store'), ['email' => $admin->email, 'password' => 'password'])->assertSessionHasErrors('email');
    $this->assertGuest();
    $this->post(route('login.store'), ['email' => $admin->email, 'password' => 'a-new-Passw0rd!'])->assertRedirect();
    $this->assertAuthenticatedAs($admin->fresh());
});
