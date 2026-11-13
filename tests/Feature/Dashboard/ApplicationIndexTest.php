<?php

use App\Enums\ApplicationStage;
use App\Models\Agency;
use App\Models\Application;
use App\Models\Employer;
use App\Models\JobPost;
use App\Models\User;
use App\Repositories\Application\ApplicationRepository;
use App\Support\DataScopeResolver;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

test('staff without an agency receive an empty applications page and deferred zero kpis', function (string $role) {
    Application::factory()->create();

    $this->actingAs(User::factory()->{$role}()->create())
        ->get(route('dashboard.applications'))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('dashboard/applications')
        ->has('applications.data', 0)
        ->where('applications.meta', [
            'current_page' => 1, 'last_page' => 1, 'per_page' => 10,
            'total' => 0, 'from' => null, 'to' => null,
        ])
        ->where('filters', ['q' => null, 'stage' => null, 'sort' => 'newest', 'per_page' => 10])
        ->missing('kpis')
        ->loadDeferredProps(fn (Assert $reload) => $reload->where('kpis', [
            'total_applicants' => 0, 'new_today' => 0, 'reviewed' => 0, 'shortlisted' => 0,
        ])));
})->with(['agency', 'admin']);

test('application visibility follows job ownership and agency boundaries', function (string $role, array $visible) {
    $agency = Agency::factory()->create();
    $poster = User::factory()->agency()->forAgency($agency)->create();
    $colleague = User::factory()->agency()->forAgency($agency)->create();
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $applications = collect([$poster, $colleague, $admin])->map(fn (User $user) => Application::factory()->for(JobPost::factory()->forPoster($user))->create());
    $foreign = Application::factory()->create();
    $applications->push($foreign);
    $user = match ($role) {
        'agency' => $poster,
        'admin' => $admin,
        'superadmin' => User::factory()->superadmin()->create(),
    };
    $ids = array_map(fn (int $index) => $applications[$index]->id, $visible);

    $this->actingAs($user)->get(route('dashboard.applications', [
        'agency_id' => $foreign->jobPost->agency_id, 'user_id' => $colleague->id,
    ]))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('applications.data', fn ($rows) => $rows->pluck('id')->sort()->values()->all() === $ids));
})->with([
    'agency' => ['agency', [0]],
    'admin' => ['admin', [0, 1, 2]],
    'superadmin' => ['superadmin', [0, 1, 2, 3]],
]);

test('application rows include archived applications and inactive posts but expose only row fields', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $applicant = User::factory()->applicant()->create(['name' => 'Maria Santos']);
    $applicant->delete();
    $employer = Employer::factory()->for($user->agency)->create(['employer_name' => 'Example employer']);
    $post = JobPost::factory()->forPoster($user)->archived()->create(['job_title' => 'Welder', 'employer_id' => $employer->id]);
    $application = Application::factory()->for($post)->for($applicant, 'applicant')->create([
        'stage' => ApplicationStage::Reviewed, 'submitted_at' => '2026-10-01 09:30:00',
        'applicant_archived_at' => now(), 'cover_letter' => 'Private letter',
    ]);

    $this->actingAs($user)->get(route('dashboard.applications', ['q' => '  Maria  ', 'per_page' => '25']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('filters.q', 'Maria')->where('filters.per_page', 25)
        ->where('applications.data', [[
            'id' => $application->id, 'stage' => 'reviewed',
            'submitted_at' => '2026-10-01T09:30:00.000000Z',
            'applicant_name' => 'Maria Santos', 'job_title' => 'Welder', 'employer_name' => 'Example employer',
            'available_transitions' => ['proceed', 'reject'],
            'can_proceed' => true, 'next_stage' => 'shortlisted', 'can_reject' => true,
        ]]));
});

test('application search matches applicant names and job titles only without widening scope', function (string $field) {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $employer = Employer::factory()->for($user->agency)->create(['employer_name' => 'Needle employer']);
    $post = JobPost::factory()->forPoster($user)->closed()->create([
        'job_title' => $field === 'title' ? 'Needle welder' : 'Welder',
        'work_location' => 'Needle location', 'employer_id' => $employer->id,
    ]);
    $application = Application::factory()->for($post)->for(User::factory()->applicant()->state([
        'name' => $field === 'name' ? 'Needle applicant' : 'Maria Santos',
    ]), 'applicant')->create(['stage' => ApplicationStage::Reviewed]);
    Application::factory()->for($post)->create(['stage' => ApplicationStage::Pending]);
    Application::factory()->for(JobPost::factory()->state(['job_title' => 'Needle foreign']))->create(['stage' => ApplicationStage::Reviewed]);

    $this->actingAs($user)->get(route('dashboard.applications', ['q' => 'nEeDlE', 'stage' => 'reviewed']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('applications.data', fn ($rows) => $rows->pluck('id')->all() === ($field === 'employer' ? [] : [$application->id])));
})->with(['name', 'title', 'employer']);

test('application search treats wildcard and escape characters literally', function (string $search, string $decoy) {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $application = Application::factory()->for(JobPost::factory()->forPoster($user)->state(['job_title' => $search.' welder']))->create();
    Application::factory()->for(JobPost::factory()->forPoster($user)->state(['job_title' => $decoy.' welder']))->create();

    $this->actingAs($user)->get(route('dashboard.applications', ['q' => $search]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('applications.data', 1)->where('applications.data.0.id', $application->id));
})->with(['percent' => ['100%', '1000'], 'underscore' => ['a_b', 'acb'], 'backslash' => ['a\\b', 'ab']]);

test('each application stage filters rows', function (ApplicationStage $stage) {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $post = JobPost::factory()->forPoster($user)->manpooling()->create(['employer_id' => null]);
    $applications = collect(ApplicationStage::cases())->map(fn (ApplicationStage $value) => Application::factory()->for($post)->create(['stage' => $value]));

    $this->actingAs($user)->get(route('dashboard.applications', ['stage' => $stage->value]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('applications.data', 1)
        ->where('applications.data.0.id', $applications->firstWhere('stage', $stage)->id)
        ->where('applications.data.0.employer_name', null));
})->with(ApplicationStage::cases());

test('the applications page rejects invalid query parameters', function (string $parameter, mixed $value) {
    $this->actingAs(User::factory()->agency()->create())->from(route('dashboard.applications'))
        ->get(route('dashboard.applications', [$parameter => $value]))
        ->assertRedirect(route('dashboard.applications'))->assertSessionHasErrors($parameter);
})->with([
    'zero page' => ['page', 0], 'fractional page' => ['page', 1.5], 'empty page' => ['page', ''],
    'invalid size' => ['per_page', 20], 'oversized size' => ['per_page', 100], 'empty size' => ['per_page', ''],
    'long search' => ['q', str_repeat('x', 101)], 'array search' => ['q', ['test']],
    'old stage label' => ['stage', 'Under review'], 'invalid stage' => ['stage', 'all'],
    'obsolete stage value' => ['stage', 'under_review'],
    'unsafe sort' => ['sort', 'id desc; drop table applications'], 'empty sort' => ['sort', ''],
]);

test('applications sort by submission time with descending id ties', function (string $sort, array $order) {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $applications = Application::factory()->for(JobPost::factory()->forPoster($user))->count(4)->sequence(
        ['submitted_at' => '2026-10-01'], ['submitted_at' => '2026-10-03'],
        ['submitted_at' => '2026-10-02'], ['submitted_at' => '2026-10-02'],
    )->create();
    $ids = array_map(fn (int $index) => $applications[$index]->id, $order);

    $this->actingAs($user)->get(route('dashboard.applications', ['sort' => $sort]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('applications.data', fn ($rows) => $rows->pluck('id')->all() === $ids));
})->with(['newest' => ['newest', [1, 3, 2, 0]], 'oldest' => ['oldest', [0, 3, 2, 1]]]);

test('application pagination returns stable rows metadata and out of range fallback', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $applications = Application::factory()->for(JobPost::factory()->forPoster($user))->count(13)->create(['submitted_at' => '2026-10-01']);

    $this->actingAs($user)->get(route('dashboard.applications'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('applications.data', 10)->where('applications.meta', [
            'current_page' => 1, 'last_page' => 2, 'per_page' => 10, 'total' => 13, 'from' => 1, 'to' => 10,
        ]));
    foreach ([2, 99] as $page) {
        $this->get(route('dashboard.applications', ['page' => $page]))->assertInertia(fn (Assert $response) => $response
            ->where('applications.data', fn ($rows) => $rows->pluck('id')->all() === $applications->pluck('id')->reverse()->slice(10)->values()->all())
            ->where('applications.meta.current_page', 2)->where('applications.meta.from', 11)->where('applications.meta.to', 13));
    }
    $this->get(route('dashboard.applications', ['per_page' => 50]))->assertInertia(fn (Assert $page) => $page
        ->has('applications.data', 13)->where('applications.meta.per_page', 50));
});

test('application kpis ignore filters and include all post statuses within the same visibility scope', function () {
    config(['app.timezone' => 'Asia/Manila']);
    $this->travelTo(CarbonImmutable::parse('2026-10-18 12:00:00', 'Asia/Manila'));
    $agency = Agency::factory()->create();
    $poster = User::factory()->agency()->forAgency($agency)->create();
    $admin = User::factory()->admin()->forAgency($agency)->create();
    foreach ([
        ['archived', ApplicationStage::Reviewed, '2026-10-18 00:00:00'],
        ['closed', ApplicationStage::Shortlisted, '2026-10-18 23:59:59'],
        ['expiredByDate', ApplicationStage::Pending, '2026-10-17 23:59:59'],
        ['neverExpires', ApplicationStage::Endorsed, '2026-10-19 00:00:00'],
    ] as [$state, $stage, $submittedAt]) {
        Application::factory()->for(JobPost::factory()->forPoster($poster)->{$state}())->create([
            'stage' => $stage, 'submitted_at' => $submittedAt, 'applicant_archived_at' => now(),
        ]);
    }
    Application::factory()->for(JobPost::factory()->forPoster($admin))->create(['stage' => ApplicationStage::Reviewed]);
    Application::factory()->for(JobPost::factory()->forPoster($poster)->closed())->notSelected()->create(['submitted_at' => '2026-10-16 12:00:00']);
    Application::factory()->create(['stage' => ApplicationStage::Shortlisted]);

    foreach ([
        [$poster, ['total_applicants' => 5, 'new_today' => 2, 'reviewed' => 1, 'shortlisted' => 1]],
        [$admin, ['total_applicants' => 6, 'new_today' => 3, 'reviewed' => 2, 'shortlisted' => 1]],
        [User::factory()->superadmin()->create(), ['total_applicants' => 7, 'new_today' => 4, 'reviewed' => 2, 'shortlisted' => 2]],
    ] as [$user, $expected]) {
        $this->actingAs($user)->get(route('dashboard.applications', ['q' => 'no-match', 'stage' => 'pending', 'page' => 99]))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('applications.data', 0)->missing('kpis')
            ->loadDeferredProps(fn (Assert $reload) => $reload->where('kpis', $expected)));
    }
});

test('application kpis use one aggregate query and table reloads skip them', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    Application::factory()->for(JobPost::factory()->forPoster($user))->create();
    DataScopeResolver::for($user);
    DB::enableQueryLog();
    DB::flushQueryLog();

    $kpis = (new ApplicationRepository)->kpisForUser($user);

    expect(DB::getQueryLog())->toHaveCount(1);
    expect($kpis['total_applicants'])->toBe(1);
    DB::flushQueryLog();
    $this->actingAs($user)->get(route('dashboard.applications'))->assertInertia(fn (Assert $page) => $page
        ->reloadOnly(['applications', 'filters'], fn (Assert $reload) => $reload->missing('kpis')));
    expect(collect(DB::getQueryLog())->filter(fn ($query) => str_contains(strtolower($query['query']), 'sum(case')))->toHaveCount(0);
    DB::disableQueryLog();
});
