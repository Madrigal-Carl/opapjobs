<?php

use App\Models\Agency;
use App\Models\Employer;
use App\Models\JobCategory;
use App\Models\JobPost;
use App\Models\JobPostQuestion;
use App\Models\JobSubcategory;
use App\Models\User;
use App\Repositories\JobPost\JobPostRepository;
use App\Services\JobPost\JobPostService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Exceptions;
use Inertia\Testing\AssertableInertia;
use Tests\Support\JobPostInput;

test('staff publish a pending job post with session ownership and a success toast', function (string $role) {
    $user = User::factory()->{$role}()->forAgency(Agency::factory()->create())->create();
    $input = JobPostInput::for($user);
    $input['questions'] = JobPostInput::questions(5);
    $input += ['agency_id' => 99999, 'posted_by_user_id' => 99999, 'status' => 'archived', 'category_id' => 99999];

    $this->actingAs($user)->post('/dashboard/jobs', $input)
        ->assertRedirect(route('dashboard.jobs'))
        ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Job post published.']);

    $post = JobPost::sole();
    expect($post->agency_id)->toBe($user->agency_id);
    expect($post->poster->agency_id)->toBe($post->agency_id);
    expect($post->posted_by_user_id)->toBe($user->id);
    expect($post->status->value)->toBe('pending');
    expect($post->display_status->value)->toBe('active');
    expect($post->other_requirements)->toBe($input['other_requirements']);
    expect($post->languages)->toHaveCount(1);
    expect($post->questions()->orderBy('sort_order')->get()->pluck('question_text')->all())
        ->toBe(['Question 1', 'Question 2', 'Question 3', 'Question 4', 'Question 5']);
    $this->assertDatabaseHas('audit_logs', ['actor_user_id' => $user->id, 'subject_id' => $post->id, 'action' => 'job_post.created']);
})->with(['agency', 'admin']);

test('staff save and edit selection choices and numeric screening questions', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $input = JobPostInput::for($user);
    $input['questions'] = [
        ['question_text' => 'Expected salary?', 'answer_type' => 'number', 'is_required' => false],
        ['question_text' => 'When can you start?', 'answer_type' => 'selection', 'options' => [' Immediately ', 'Within 2 weeks'], 'is_required' => true],
        ['question_text' => 'Preferred shift?', 'answer_type' => 'selection', 'options' => ['Immediately', 'Later']],
    ];

    $this->actingAs($user)->post('/dashboard/jobs', $input)->assertSessionHasNoErrors()->assertRedirect(route('dashboard.jobs'));
    $post = JobPost::sole();
    $questions = $post->questions()->orderBy('sort_order')->get();
    expect($questions[0]->answer_type->value)->toBe('number');
    expect($questions[1]->options)->toBe(['Immediately', 'Within 2 weeks']);
    expect($questions[1]->expected_answer)->toBeNull();
    $this->get("/dashboard/jobs/{$post->id}/edit")->assertInertia(fn (AssertableInertia $page) => $page
        ->where('jobPost.questions.1.options', ['Immediately', 'Within 2 weeks']));

    $input['questions'][1]['id'] = $questions[1]->id;
    $input['questions'][1]['options'] = ['Next week', 'Next month'];
    $this->put("/dashboard/jobs/{$post->id}", $input)->assertSessionHasNoErrors()->assertRedirect(route('dashboard.jobs'));
    expect(JobPostQuestion::findOrFail($questions[1]->id)->options)->toBe(['Next week', 'Next month']);
});

test('selection questions require a valid list of distinct choices', function (mixed $options, string $field) {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $input = JobPostInput::for($user);
    $input['questions'] = [['question_text' => 'When?', 'answer_type' => 'selection', 'options' => $options]];

    $this->actingAs($user)->post('/dashboard/jobs', $input)->assertSessionHasErrors($field);
    $this->assertDatabaseCount('job_posts', 0);
})->with([
    'missing choices' => [null, 'questions.0.options'],
    'single choice' => [['Now'], 'questions.0.options'],
    'blank choice' => [['Now', ' '], 'questions.0.options.1'],
    'duplicate choices' => [['Now', ' now '], 'questions.0.options'],
    'not a list' => [['a' => 'Now', 'b' => 'Later'], 'questions.0.options'],
    'too many choices' => [array_map(fn (int $i): string => "Choice {$i}", range(1, 21)), 'questions.0.options'],
    'long choice' => [['Now', str_repeat('a', 256)], 'questions.0.options.1'],
]);

test('zero or many questions are saved in order in one insert', function (int $count) {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $input = JobPostInput::for($user);
    $input['questions'] = $count === 0 ? [] : JobPostInput::questions($count);
    DB::enableQueryLog();
    DB::flushQueryLog();

    $this->actingAs($user)->post('/dashboard/jobs', $input)->assertRedirect(route('dashboard.jobs'));

    $inserts = collect(DB::getQueryLog())->filter(fn ($query) => str_starts_with(strtolower($query['query']), 'insert into "job_post_questions"'));
    DB::disableQueryLog();
    expect($inserts)->toHaveCount($count === 0 ? 0 : 1);
    $questions = JobPost::sole()->questions()->orderBy('sort_order')->get();
    expect($questions)->toHaveCount($count);
    foreach ($questions as $index => $question) {
        expect($question->sort_order)->toBe($index);
        expect($question->question_text)->toBe('Question '.($index + 1));
        expect($question->is_required)->toBe($index % 2 === 0);
    }
})->with([0, 1, 5, 20]);

test('job post validation returns per field errors and one summary toast', function (array $changes, string $field) {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $input = array_replace(JobPostInput::for($user), $changes);

    $this->actingAs($user)->from('/dashboard/jobs/new')->post('/dashboard/jobs', $input)
        ->assertRedirect('/dashboard/jobs/new')->assertSessionHasErrors($field)
        ->assertInertiaFlash('toast', ['type' => 'error', 'message' => 'Please fix the highlighted fields.']);
    $this->assertDatabaseCount('job_posts', 0);
})->with([
    'title' => [['job_title' => null], 'job_title'],
    'missing recruitment' => [['recruitment_type' => null], 'recruitment_type'],
    'missing contract' => [['contract_type' => null], 'contract_type'],
    'missing education' => [['education_level' => null], 'education_level'],
    'missing gender' => [['gender_requirement' => null], 'gender_requirement'],
    'long title' => [['job_title' => str_repeat('x', 256)], 'job_title'],
    'subcategory' => [['job_subcategory_id' => null], 'job_subcategory_id'],
    'location' => [['work_location' => null], 'work_location'],
    'quantity' => [['vacant_positions' => null], 'vacant_positions'],
    'zero quantity' => [['vacant_positions' => 0], 'vacant_positions'],
    'large quantity' => [['vacant_positions' => 65536], 'vacant_positions'],
    'recruitment' => [['recruitment_type' => 'unknown'], 'recruitment_type'],
    'contract' => [['contract_type' => 'unknown'], 'contract_type'],
    'education' => [['education_level' => 'any'], 'education_level'],
    'gender' => [['gender_requirement' => 'unknown'], 'gender_requirement'],
    'currency' => [['salary_currency' => 'EUR'], 'salary_currency'],
    'required currency' => [['salary_currency' => null], 'salary_currency'],
    'salary range' => [['monthly_salary_max' => 1], 'monthly_salary_max'],
    'experience range' => [['min_experience_years' => 6], 'max_experience_years'],
    'experience bound' => [['min_experience_years' => 256], 'min_experience_years'],
    'email' => [['contact_email' => 'invalid'], 'contact_email'],
    'past closing date' => [['closing_date' => '2000-01-01'], 'closing_date'],
    'missing description' => [['job_description' => '  '], 'job_description'],
    'HTML description' => [['job_description' => '<script>alert(1)</script>'], 'job_description'],
    'HTML requirements' => [['other_requirements' => '<b>Certificate</b>'], 'other_requirements'],
    'HTML instructions' => [['application_instructions' => '<script'], 'application_instructions'],
    'long description' => [['job_description' => str_repeat('a', 20001)], 'job_description'],
    'long requirements' => [['other_requirements' => str_repeat('a', 20001)], 'other_requirements'],
    'long instructions' => [['application_instructions' => str_repeat('a', 20001)], 'application_instructions'],
    'language enum' => [['languages' => [['language' => 'invented', 'proficiency' => 'fluent']]], 'languages.0.language'],
    'proficiency enum' => [['languages' => [['language' => 'english', 'proficiency' => 'expert']]], 'languages.0.proficiency'],
    'duplicate language' => [['languages' => array_fill(0, 2, ['language' => 'english', 'proficiency' => 'fluent'])], 'languages.1.language'],
    '21 questions' => [['questions' => JobPostInput::questions(21)], 'questions'],
    'blank question' => [['questions' => [['question_text' => ' ', 'answer_type' => 'short']]], 'questions.0.question_text'],
    'long question' => [['questions' => [['question_text' => str_repeat('x', 256), 'answer_type' => 'short']]], 'questions.0.question_text'],
    'long answer' => [['questions' => [['question_text' => 'Question', 'answer_type' => 'short', 'expected_answer' => str_repeat('a', 2001)]]], 'questions.0.expected_answer'],
    'answer type' => [['questions' => [['question_text' => 'Question', 'answer_type' => 'invalid']]], 'questions.0.answer_type'],
    'paragraph answer type' => [['questions' => [['question_text' => 'Question', 'answer_type' => 'paragraph']]], 'questions.0.answer_type'],
    'short expected answer' => [['questions' => [['question_text' => 'Question', 'answer_type' => 'short', 'expected_answer' => 'An expected response']]], 'questions.0.expected_answer'],
    'yesno answer' => [['questions' => [['question_text' => 'Question', 'answer_type' => 'yesno', 'expected_answer' => 'maybe']]], 'questions.0.expected_answer'],
    'duplicate question' => [['questions' => [
        ['question_text' => ' Are you qualified? ', 'answer_type' => 'short'],
        ['question_text' => 'are YOU qualified?', 'answer_type' => 'short'],
    ]], 'questions.1.question_text'],
]);

test('invalid employer and pathway selections have safe domain messages', function (string $case, string $message) {
    $agency = Agency::factory()->create(['pathway' => 'landbased']);
    $user = User::factory()->agency()->forAgency($agency)->create();
    $input = JobPostInput::for($user);
    match ($case) {
        'foreign employer' => $input['employer_id'] = Employer::factory()->create()->id,
        'missing employer' => $input['employer_id'] = 999999,
        'archived employer' => $input['employer_id'] = Employer::factory()->for($agency)->create(['deleted_at' => now()])->id,
        'missing subcategory' => $input['job_subcategory_id'] = 999999,
        'archived subcategory' => JobSubcategory::findOrFail($input['job_subcategory_id'])->delete(),
        'archived category' => JobSubcategory::findOrFail($input['job_subcategory_id'])->category->delete(),
        'pathway mismatch' => $input['job_subcategory_id'] = JobSubcategory::factory()->for(JobCategory::factory()->state(['pathway' => 'seabased']), 'category')->create()->id,
    };

    $this->actingAs($user)->from('/dashboard/jobs/new')->post('/dashboard/jobs', $input)
        ->assertRedirect('/dashboard/jobs/new')->assertInertiaFlash('toast.message', $message);
    $this->assertDatabaseCount('job_posts', 0);
})->with([
    ['foreign employer', 'Choose an active employer belonging to your agency.'],
    ['missing employer', 'Choose an active employer belonging to your agency.'],
    ['archived employer', 'Choose an active employer belonging to your agency.'],
    ['missing subcategory', 'Choose an active subcategory from your agency’s pathway.'],
    ['archived subcategory', 'Choose an active subcategory from your agency’s pathway.'],
    ['archived category', 'Choose an active subcategory from your agency’s pathway.'],
    ['pathway mismatch', 'Choose an active subcategory from your agency’s pathway.'],
]);

test('question failures roll back the post and languages and report a generic error', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $input = JobPostInput::for($user);
    $input['questions'] = JobPostInput::questions(1);
    $this->partialMock(JobPostRepository::class)->shouldReceive('createQuestions')->once()->andThrow(new RuntimeException('secret database failure'));
    Exceptions::fake();

    $this->actingAs($user)->from('/dashboard/jobs/new')->post('/dashboard/jobs', $input)
        ->assertRedirect('/dashboard/jobs/new')
        ->assertInertiaFlash('toast.message', 'Something went wrong. Your job post was not published. Please try again.');

    $this->assertDatabaseCount('job_posts', 0);
    $this->assertDatabaseCount('job_post_languages', 0);
    $this->assertDatabaseCount('job_post_questions', 0);
    $this->assertDatabaseCount('audit_logs', 0);
    Exceptions::assertReported(RuntimeException::class);
});

test('unexpected service failures never expose their message', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $input = JobPostInput::for($user);
    $this->mock(JobPostService::class)->shouldReceive('create')->once()->andThrow(new RuntimeException('private password'));
    Exceptions::fake();

    $this->actingAs($user)->from('/dashboard/jobs/new')->post('/dashboard/jobs', $input)
        ->assertRedirect('/dashboard/jobs/new')
        ->assertInertiaFlash('toast.message', 'Something went wrong. Your job post was not published. Please try again.');
    Exceptions::assertReported(RuntimeException::class);
});

test('today is accepted and optional blank fields are normalized with question defaults', function () {
    config(['app.timezone' => 'Asia/Manila']);
    $this->travelTo(CarbonImmutable::parse('2026-10-19 00:01:00', 'Asia/Manila'));
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $employer = Employer::factory()->for($user->agency)->create();
    $input = array_replace(JobPostInput::for($user), [
        'closing_date' => '2026-10-19', 'min_experience_years' => '', 'max_experience_years' => '',
        'other_requirements' => '  ', 'contact_email' => '', 'monthly_salary_min' => '',
        'monthly_salary_max' => 0, 'employer_id' => $employer->id, 'recruitment_type' => 'manpooling',
        'questions' => [['question_text' => ' Qualified? ', 'answer_type' => 'yesno', 'expected_answer' => ' ']],
    ]);

    $this->actingAs($user)->post('/dashboard/jobs', $input)->assertRedirect(route('dashboard.jobs'));

    $post = JobPost::sole();
    expect($post->display_status->value)->toBe('active');
    expect($post->employer_id)->toBe($employer->id);
    expect($post->other_requirements)->toBeNull();
    expect($post->min_experience_years)->toBeNull();
    expect($post->contact_email)->toBeNull();
    expect($post->questions->sole()->is_required)->toBeFalse();
    expect($post->questions->sole()->expected_answer)->toBeNull();
});

test('a published job post is visible to its poster and agency admin but not a colleague', function () {
    $agency = Agency::factory()->create();
    $poster = User::factory()->agency()->forAgency($agency)->create();
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $colleague = User::factory()->agency()->forAgency($agency)->create();
    $foreign = User::factory()->admin()->forAgency(Agency::factory()->create())->create();

    $this->actingAs($poster)->post('/dashboard/jobs', JobPostInput::for($poster))->assertRedirect(route('dashboard.jobs'));

    foreach ([$poster, $admin] as $user) {
        $this->actingAs($user)->get(route('dashboard.jobs'))->assertInertia(fn (AssertableInertia $page) => $page->has('jobPosts.data', 1));
    }
    foreach ([$colleague, $foreign] as $user) {
        $this->actingAs($user)->get(route('dashboard.jobs'))->assertInertia(fn (AssertableInertia $page) => $page->has('jobPosts.data', 0));
    }
});

test('publish-only accounts land on an accessible success page instead of a forbidden jobs index', function () {
    $user = User::factory()->forAgency(Agency::factory()->create())->create();
    $user->givePermissionTo(['access dashboard', 'managejob']);

    $this->actingAs($user)->post('/dashboard/jobs', JobPostInput::for($user))
        ->assertRedirect(route('dashboard.jobs.create'))
        ->assertInertiaFlash('toast.message', 'Job post published.');

    $this->get(route('dashboard.jobs.create'))->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
        ->component('dashboard/jobs/new')->hasFlash('toast.message', 'Job post published.'));
    $this->assertDatabaseCount('job_posts', 1);
});

test('a job order posting requires its number, which manpooling never carries, and documents are stored as a list', function () {
    $user = User::factory()->admin()->forAgency(Agency::factory()->create())->create();

    // A job order posting without its number is incomplete.
    $input = JobPostInput::for($user);
    $input['job_order_number'] = '';
    $this->actingAs($user)->post('/dashboard/jobs', $input)
        ->assertSessionHasErrors('job_order_number');

    // An unnamed entry is a real mistake, not something to silently drop.
    $input = JobPostInput::for($user);
    $input['required_documents'] = ['COC', ''];
    $this->actingAs($user)->post('/dashboard/jobs', $input)
        ->assertSessionHasErrors('required_documents.1');

    // Documents are trimmed and deduplicated but keep their order.
    $input = JobPostInput::for($user);
    $input['required_documents'] = ['  COC  ', 'PSNC', 'COC'];
    $this->actingAs($user)->post('/dashboard/jobs', $input)
        ->assertRedirect(route('dashboard.jobs'));

    $post = JobPost::sole();
    expect($post->job_order_number)->toBe('JO-2026-0001');
    expect($post->required_documents)->toBe(['COC', 'PSNC']);

    // A number typed before the toggle moved must not survive the switch.
    $input = JobPostInput::for($user);
    $input['recruitment_type'] = 'manpooling';
    $this->actingAs($user)->post('/dashboard/jobs', $input)
        ->assertRedirect(route('dashboard.jobs'));
    expect(JobPost::latest('id')->first()->job_order_number)->toBeNull();
});
