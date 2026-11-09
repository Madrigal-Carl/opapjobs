<?php

use App\Enums\DataScope;
use App\Enums\JobPostDisplayStatus;
use App\Models\Agency;
use App\Models\Application;
use App\Models\Employer;
use App\Models\JobPost;
use App\Models\JobSubcategory;
use App\Models\User;
use App\Repositories\JobPost\JobPostRepository;
use App\Support\DataScopeResolver;
use App\Support\JobPostIndexFilters;
use Carbon\CarbonImmutable;
use Database\Seeders\DemoAgencySeeder;
use Database\Seeders\DemoJobPostSeeder;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

test('staff without an agency receive an empty job post page and deferred zero kpis', function (string $role) {
    $this->actingAs(User::factory()->{$role}()->create())
        ->get(route('dashboard.jobs'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/jobs')
            ->has('jobPosts.data', 0)
            ->where('jobPosts.meta.current_page', 1)
            ->where('jobPosts.meta.last_page', 1)
            ->where('jobPosts.meta.per_page', 10)
            ->where('jobPosts.meta.total', 0)
            ->where('filters', [
                'q' => null, 'status' => null, 'recruitment_type' => null,
                'sort' => 'newest', 'per_page' => 10,
            ])
            ->where('canManageJobs', true)
            ->missing('kpis')
            ->loadDeferredProps(fn (Assert $reload) => $reload
                ->where('kpis', [
                    'active_jobs' => 0, 'total_applicants' => 0,
                    'with_job_order' => 0, 'successful_placements' => 0,
                ])
            )
        );
})->with(['agency', 'admin']);

test('job post visibility follows the permission and agency boundary', function () {
    $agency = Agency::factory()->create();
    $poster = User::factory()->agency()->forAgency($agency)->create();
    $colleague = User::factory()->agency()->forAgency($agency)->create();
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $own = JobPost::factory()->forPoster($poster)->create();
    $others = JobPost::factory()->forPoster($colleague)->create();
    $adminPost = JobPost::factory()->forPoster($admin)->create();
    $foreign = JobPost::factory()->create();
    $superadmin = User::factory()->superadmin()->create();

    expect(DataScopeResolver::for($poster))->toBe(DataScope::Own);
    expect(DataScopeResolver::for($admin))->toBe(DataScope::Agency);
    expect(DataScopeResolver::for($superadmin))->toBe(DataScope::All);
    expect(DataScopeResolver::for(null))->toBe(DataScope::None);
    expect(DataScopeResolver::for(User::factory()->applicant()->create()))->toBe(DataScope::None);
    expect(DataScopeResolver::for(User::factory()->agency()->create()))->toBe(DataScope::None);
    expect($agency->fresh()->admin_user_id)->toBe($admin->id);

    expect(JobPost::query()->visibleTo($poster)->pluck('id')->all())->toBe([$own->id]);
    expect(JobPost::query()->visibleTo($admin)->pluck('id')->all())
        ->toEqualCanonicalizing([$own->id, $others->id, $adminPost->id]);
    expect(JobPost::query()->visibleTo($superadmin)->pluck('id')->all())
        ->toEqualCanonicalizing([$own->id, $others->id, $adminPost->id, $foreign->id]);
    expect(JobPost::query()->visibleTo(User::factory()->admin()->create())->count())->toBe(0);

    $this->actingAs($poster)->get(route('dashboard.jobs', ['agency_id' => $foreign->agency_id, 'user_id' => $colleague->id]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('jobPosts.data', 1)->where('jobPosts.data.0.id', $own->id));
    $this->actingAs($admin)->get(route('dashboard.jobs'))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->has('jobPosts.data', 3));
    $this->actingAs($superadmin)->get(route('dashboard.jobs'))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->has('jobPosts.data', 4));
});

test('the jobs page rejects invalid query parameters', function (string $parameter, mixed $value) {
    $this->actingAs(User::factory()->agency()->create())
        ->from(route('dashboard.jobs'))
        ->get(route('dashboard.jobs', [$parameter => $value]))
        ->assertRedirect(route('dashboard.jobs'))
        ->assertSessionHasErrors($parameter);
})->with([
    'zero page' => ['page', 0],
    'fractional page' => ['page', 1.5],
    'invalid page size' => ['per_page', 20],
    'oversized page size' => ['per_page', 100],
    'empty page size' => ['per_page', ''],
    'long search' => ['q', str_repeat('x', 101)],
    'array search' => ['q', ['test']],
    'old mock status' => ['status', 'published'],
    'stored status' => ['status', 'pending'],
    'invalid recruitment type' => ['recruitment_type', 'all'],
    'unsafe sort' => ['sort', 'id desc; drop table job_posts'],
    'empty sort' => ['sort', ''],
]);

test('filters are normalized and only the safe job post row fields are returned', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $post = JobPost::factory()->forPoster($user)->create([
        'job_title' => 'Welder', 'work_location' => 'Riyadh',
        'salary_currency' => 'SAR', 'monthly_salary_min' => '2500.00', 'monthly_salary_max' => '3200.00',
        'created_at' => '2026-10-01 09:30:00', 'is_urgent' => true, 'vacant_positions' => 4,
        'job_description' => 'Private description', 'contact_email' => 'private@example.test',
    ]);

    $this->actingAs($user)->get(route('dashboard.jobs', ['q' => '  Welder  ', 'per_page' => '25']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('filters.q', 'Welder')->where('filters.per_page', 25)
        ->where('jobPosts.data', [[
            'id' => $post->id, 'job_title' => 'Welder', 'work_location' => 'Riyadh',
            'created_at' => '2026-10-01T09:30:00.000000Z', 'closing_date' => null,
            'salary_currency' => 'SAR', 'monthly_salary_min' => '2500.00', 'monthly_salary_max' => '3200.00',
            'recruitment_type' => 'joborder', 'display_status' => 'active',
            'applicants_count' => 0, 'hired_count' => 0, 'vacant_positions' => 4, 'is_urgent' => true,
        ]]));
});

test('job rows count only hired applicants against the original vacancies', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $post = JobPost::factory()->forPoster($user)->create(['vacant_positions' => 4]);
    Application::factory()->for($post)->hired()->count(2)->create();
    Application::factory()->for($post)->pending()->create();
    Application::factory()->for($post)->reviewed()->create();
    Application::factory()->for($post)->shortlisted()->create();
    Application::factory()->for($post)->interviewed()->create();
    Application::factory()->for($post)->rejected()->create();
    Application::factory()->hired()->create();

    $this->actingAs($user)->get(route('dashboard.jobs'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('jobPosts.data', 1)
        ->where('jobPosts.data.0.id', $post->id)
        ->where('jobPosts.data.0.hired_count', 2)
        ->where('jobPosts.data.0.vacant_positions', 4)
        ->where('jobPosts.data.0.applicants_count', 7));
});

test('display status filtering respects manual status and app timezone dates', function () {
    config(['app.timezone' => 'Asia/Manila']);
    CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-18 23:59:59', 'Asia/Manila'));

    try {
        $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
        $today = JobPost::factory()->forPoster($user)->closingToday()->create();
        $never = JobPost::factory()->forPoster($user)->neverExpires()->create();
        $future = JobPost::factory()->forPoster($user)->create(['closing_date' => '2026-10-20']);
        $expired = JobPost::factory()->forPoster($user)->expiredByDate()->create();
        $closed = JobPost::factory()->forPoster($user)->closed()->create(['closing_date' => '2026-10-17']);
        $archived = JobPost::factory()->forPoster($user)->archived()->create(['closing_date' => '2026-10-17']);

        $this->actingAs($user)->get(route('dashboard.jobs'))->assertInertia(fn (Assert $page) => $page
            ->has('jobPosts.data', 5)
            ->where('jobPosts.data.0.display_status', 'closed'));

        foreach ([
            'active' => [$future->id, $never->id, $today->id],
            'expired' => [$expired->id], 'closed' => [$closed->id], 'archived' => [$archived->id],
        ] as $status => $ids) {
            $this->get(route('dashboard.jobs', ['status' => $status]))
                ->assertInertia(fn (Assert $page) => $page
                    ->where('jobPosts.data', fn ($rows) => $rows->pluck('id')->all() === $ids));
        }

        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-19 00:00:01', 'Asia/Manila'));
        $this->get(route('dashboard.jobs', ['status' => 'expired']))
            ->assertInertia(fn (Assert $page) => $page->where('jobPosts.data', fn ($rows) => $rows->pluck('id')->all() === [$expired->id, $today->id]));
        expect($today->fresh()->display_status)->toBe(JobPostDisplayStatus::Expired);
    } finally {
        CarbonImmutable::setTestNow();
    }
});

test('pagination defaults clamps and retains query strings', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $posts = JobPost::factory()->forPoster($user)->count(13)->create(['job_title' => 'Welder']);

    $this->actingAs($user)->get(route('dashboard.jobs'))->assertInertia(fn (Assert $page) => $page
        ->has('jobPosts.data', 10)->where('jobPosts.meta.total', 13)->where('jobPosts.meta.last_page', 2));
    $this->get(route('dashboard.jobs', ['page' => 2]))->assertInertia(fn (Assert $page) => $page
        ->has('jobPosts.data', 3)->where('jobPosts.meta.current_page', 2)
        ->where('jobPosts.meta.from', 11)->where('jobPosts.meta.to', 13));
    $this->get(route('dashboard.jobs', ['page' => 99]))->assertInertia(fn (Assert $page) => $page
        ->has('jobPosts.data', 3)->where('jobPosts.meta.current_page', 2));
    $this->get(route('dashboard.jobs', ['per_page' => 50]))->assertInertia(fn (Assert $page) => $page
        ->has('jobPosts.data', 13)->where('jobPosts.meta.per_page', 50));

    request()->query->replace(['q' => 'Welder', 'status' => 'active']);
    $results = (new JobPostRepository)->paginateForUser($user, new JobPostIndexFilters(q: 'Welder'));
    parse_str(parse_url($results->nextPageUrl(), PHP_URL_QUERY), $query);
    expect($query)->toMatchArray(['q' => 'Welder', 'status' => 'active', 'page' => '2']);
    expect($results->pluck('id')->all())->toBe($posts->pluck('id')->reverse()->take(10)->values()->all());
});

test('search matches job post and related names without widening scope', function (string $field) {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $post = JobPost::factory()->forPoster($user)->closed()->create();
    match ($field) {
        'title' => $post->update(['job_title' => 'Special Needle engineer']),
        'location' => $post->update(['work_location' => 'Special Needle city']),
        'employer' => $post->update(['employer_id' => Employer::factory()->for($user->agency)->create(['employer_name' => 'Special Needle company'])->id]),
        'subcategory' => $post->subcategory->update(['subcategory_name' => 'Special Needle trade']),
        'category' => $post->subcategory->category->update(['category_name' => 'Special Needle category']),
    };
    JobPost::factory()->closed()->create(['job_title' => 'Special Needle foreign post']);
    JobPost::factory()->forPoster($user)->pending()->create(['job_title' => 'Special Needle active post']);

    $this->actingAs($user)->get(route('dashboard.jobs', ['q' => 'nEeDlE', 'status' => 'closed']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('jobPosts.data', 1)->where('jobPosts.data.0.id', $post->id));
})->with(['title', 'location', 'employer', 'subcategory', 'category']);

test('search treats wildcard and escape characters literally', function (string $search, string $title, string $decoy) {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $post = JobPost::factory()->forPoster($user)->create(['job_title' => $title]);
    JobPost::factory()->forPoster($user)->create(['job_title' => $decoy]);

    $this->actingAs($user)->get(route('dashboard.jobs', ['q' => $search]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('jobPosts.data', 1)->where('jobPosts.data.0.id', $post->id));
})->with([
    'percent' => ['100%', '100% technician', '1000 technician'],
    'underscore' => ['a_b', 'a_b technician', 'acb technician'],
    'backslash' => ['a\\b', 'a\\b technician', 'ab technician'],
    'combined' => ['a\\_%', 'a\\_% technician', 'a\\xyz technician'],
]);

test('recruitment type filters job posts', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $post = JobPost::factory()->forPoster($user)->manpooling()->create();
    JobPost::factory()->forPoster($user)->create();

    $this->actingAs($user)->get(route('dashboard.jobs', ['recruitment_type' => 'manpooling']))
        ->assertInertia(fn (Assert $page) => $page->has('jobPosts.data', 1)->where('jobPosts.data.0.id', $post->id));
});

test('each sort orders job posts deterministically', function (string $sort, array $order) {
    $this->travelTo(CarbonImmutable::parse('2026-10-18 12:00:00'));
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $factory = JobPost::factory()->forPoster($user);
    $posts = [
        $factory->create(['created_at' => '2026-10-01', 'closing_date' => '2026-10-20', 'monthly_salary_min' => 100]),
        $factory->create(['created_at' => '2026-10-03', 'closing_date' => null, 'monthly_salary_min' => null]),
        $factory->create(['created_at' => '2026-10-02', 'closing_date' => '2026-10-18', 'monthly_salary_min' => 300]),
        $factory->closed()->create(['created_at' => '2026-10-02', 'closing_date' => '2026-10-17', 'monthly_salary_min' => 200]),
    ];
    Application::factory()->for($posts[0])->count(2)->create();
    Application::factory()->for($posts[2])->count(3)->create();
    $ids = array_map(fn ($index) => $posts[$index]->id, $order);

    $this->actingAs($user)->get(route('dashboard.jobs', ['sort' => $sort]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('jobPosts.data', fn ($rows) => $rows->pluck('id')->all() === $ids));
})->with([
    'newest' => ['newest', [1, 3, 2, 0]],
    'oldest' => ['oldest', [0, 3, 2, 1]],
    'expiring' => ['expiring', [2, 0, 3, 1]],
    'applicants' => ['applicants', [2, 0, 3, 1]],
    'salary' => ['salary', [2, 3, 0, 1]],
]);

test('sort ties remain stable across page boundaries', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $posts = JobPost::factory()->forPoster($user)->count(12)->create(['created_at' => '2026-10-01']);
    $this->actingAs($user)->get(route('dashboard.jobs', ['page' => 1]))
        ->assertInertia(fn (Assert $page) => $page->where('jobPosts.data', fn ($rows) => $rows->pluck('id')->all() === $posts->pluck('id')->reverse()->take(10)->values()->all()));
    $this->get(route('dashboard.jobs', ['page' => 2]))
        ->assertInertia(fn (Assert $page) => $page->where('jobPosts.data', fn ($rows) => $rows->pluck('id')->all() === $posts->pluck('id')->reverse()->slice(10)->values()->all()));
});

test('deferred kpis use the same visibility scope regardless of table filters', function () {
    $agency = Agency::factory()->create();
    $poster = User::factory()->agency()->forAgency($agency)->create();
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $active = JobPost::factory()->forPoster($poster)->create();
    $archived = JobPost::factory()->forPoster($poster)->archived()->create();
    JobPost::factory()->forPoster($poster)->expiredByDate()->manpooling()->create();
    $colleaguePost = JobPost::factory()->forPoster($admin)->closed()->create();
    $foreign = JobPost::factory()->create();
    Application::factory()->for($active)->create();
    Application::factory()->for($archived)->hired()->create(['applicant_archived_at' => now()]);
    Application::factory()->for($colleaguePost)->hired()->create();
    Application::factory()->for($foreign)->count(2)->hired()->create();

    foreach ([
        [$poster, ['active_jobs' => 1, 'total_applicants' => 2, 'with_job_order' => 1, 'successful_placements' => 1]],
        [$admin, ['active_jobs' => 1, 'total_applicants' => 3, 'with_job_order' => 2, 'successful_placements' => 2]],
        [User::factory()->superadmin()->create(), ['active_jobs' => 2, 'total_applicants' => 5, 'with_job_order' => 3, 'successful_placements' => 4]],
    ] as [$user, $expected]) {
        $this->actingAs($user)->get(route('dashboard.jobs', ['q' => 'no-match', 'status' => 'closed', 'page' => 99]))
            ->assertInertia(fn (Assert $page) => $page->has('jobPosts.data', 0)->missing('kpis')
                ->loadDeferredProps(fn (Assert $reload) => $reload->where('kpis', $expected)));
    }
});

test('kpis execute exactly two aggregate queries and table reloads skip them', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    JobPost::factory()->forPoster($user)->create();
    DataScopeResolver::for($user);
    DB::enableQueryLog();
    DB::flushQueryLog();

    $kpis = (new JobPostRepository)->kpisForUser($user);

    expect(DB::getQueryLog())->toHaveCount(2);
    expect($kpis['active_jobs'])->toBe(1);
    DB::flushQueryLog();

    $this->actingAs($user)->get(route('dashboard.jobs', ['q' => 'none']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->missing('kpis')
        ->reloadOnly(['jobPosts', 'filters'], fn (Assert $reload) => $reload
            ->missing('kpis')->where('jobPosts.meta.total', 0)));

    expect(collect(DB::getQueryLog())->filter(fn ($query) => str_contains(strtolower($query['query']), 'sum(case')))->toHaveCount(0);
    DB::disableQueryLog();
});

test('table query count stays constant as rows and applications increase', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $factory = JobPost::factory()->forPoster($user);
    $factory->count(3)->has(Application::factory()->count(2))->create();
    $this->actingAs($user)->get(route('dashboard.jobs'))->assertOk();
    DB::enableQueryLog();
    DB::flushQueryLog();

    $this->get(route('dashboard.jobs'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('jobPosts.data', 3)->where('jobPosts.data.0.applicants_count', 2));
    $small = count(DB::getQueryLog());
    $factory->count(7)->has(Application::factory()->count(3))->create();
    DB::flushQueryLog();
    $this->get(route('dashboard.jobs'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('jobPosts.data', 10)->where('jobPosts.data.0.applicants_count', 3));

    expect(count(DB::getQueryLog()))->toBe($small);
    DB::disableQueryLog();
});

test('local demo staff each have job posts in every display status', function (int $agencyUserCount) {
    $this->app->instance('env', 'local');
    $this->travelTo(CarbonImmutable::parse('2026-10-18 12:00:00'));
    $agency = Agency::factory()->create(['slug' => DemoAgencySeeder::SLUGS[0]]);
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $staff = User::factory()->agency()->forAgency($agency)->count($agencyUserCount)->create();
    Employer::factory()->for($agency)->count(4)->create();

    foreach (DemoJobPostSeeder::roles() as $role) {
        if ($role['pathway'] === 'landbased') {
            JobSubcategory::factory()->create(['subcategory_name' => $role['subcategory']]);
        }
    }

    $this->seed(DemoJobPostSeeder::class);
    $count = JobPost::count();
    $this->seed(DemoJobPostSeeder::class);

    expect(JobPost::count())->toBe($count)->toBe(($agencyUserCount + 1) * 4);
    expect(JobPost::where('recruitment_type', 'joborder')->whereNull('job_order_number')->count())->toBe(0);
    expect(JobPost::where('recruitment_type', 'manpooling')->whereNotNull('job_order_number')->count())->toBe(0);
    expect(JobPost::where('recruitment_type', 'joborder')->distinct()->count('job_order_number'))
        ->toBe(JobPost::where('recruitment_type', 'joborder')->count());
    foreach ([$admin, ...$staff] as $poster) {
        expect(JobPost::where('posted_by_user_id', $poster->id)->get()->pluck('display_status')->all())
            ->toContain(JobPostDisplayStatus::Active, JobPostDisplayStatus::Expired, JobPostDisplayStatus::Closed, JobPostDisplayStatus::Archived);
    }
})->with([2, 3, 4]);
