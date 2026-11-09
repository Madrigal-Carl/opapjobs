<?php

use App\Models\Agency;
use App\Models\Application;
use App\Models\ApplicationAnswer;
use App\Models\Employer;
use App\Models\JobCategory;
use App\Models\JobPost;
use App\Models\JobSubcategory;
use App\Models\User;
use App\Repositories\JobPost\JobPostRepository;
use Illuminate\Support\Facades\Exceptions;
use Inertia\Testing\AssertableInertia;
use Tests\Support\JobPostInput;

test('staff update the shared form without changing ownership or status', function (string $role) {
    $poster = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $user = $role === 'poster' ? $poster : User::factory()->admin()->forAgency($poster->agency)->create();
    $post = JobPost::factory()->forPoster($poster)->closed()->create();
    $input = JobPostInput::for($user);
    $input['required_documents'] = ['COC', 'NBI'];
    $input['questions'] = JobPostInput::questions(1);
    $input += ['agency_id' => 999, 'posted_by_user_id' => 999, 'status' => 'pending'];

    $this->actingAs($user)->put("/dashboard/jobs/{$post->id}", $input)
        ->assertRedirect(route('dashboard.jobs'))->assertInertiaFlash('toast.message', 'Job post updated.');

    $post->refresh();
    expect($post->job_title)->toBe('Electrician');
    expect($post->job_order_number)->toBe('JO-2026-0001');
    expect($post->required_documents)->toBe(['COC', 'NBI']);
    expect($post->agency_id)->toBe($poster->agency_id);
    expect($post->posted_by_user_id)->toBe($poster->id);
    expect($post->status->value)->toBe('closed');
    expect($post->languages->sole()->language->value)->toBe('english');
    $this->assertDatabaseHas('audit_logs', ['actor_user_id' => $user->id, 'subject_id' => $post->id, 'action' => 'job_post.updated']);
    $this->get("/dashboard/jobs/{$post->id}/edit")->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
        ->component('dashboard/jobs/new')->has('categories')->has('options')->has('employers')
        ->where('jobPost.id', $post->id)->where('jobPost.job_order_number', 'JO-2026-0001')
        ->where('jobPost.required_documents', ['COC', 'NBI'])->where('jobPost.is_urgent', true)
        ->where('jobPost.questions.0.id', $post->questions->sole()->id)->has('jobPost.languages', 1));
})->with(['poster', 'admin']);

test('updates require a job order number only for joborder and clear stale manpooling numbers', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $post = JobPost::factory()->forPoster($user)->create();
    $input = JobPostInput::for($user);
    $input['job_order_number'] = '';

    $this->actingAs($user)->put("/dashboard/jobs/{$post->id}", $input)->assertSessionHasErrors('job_order_number');
    $input['recruitment_type'] = 'manpooling';
    $input['job_order_number'] = 'JO-stale';
    $this->put("/dashboard/jobs/{$post->id}", $input)->assertRedirect(route('dashboard.jobs'));

    expect($post->fresh()->job_order_number)->toBeNull();
});

test('job management never touches posts outside the visible scope', function (string $scope) {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $poster = $scope === 'colleague' ? User::factory()->agency()->forAgency($user->agency)->create() : User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $post = JobPost::factory()->forPoster($poster)->create();

    $this->actingAs($user)->get("/dashboard/jobs/{$post->id}/edit")->assertNotFound();
    $this->put("/dashboard/jobs/{$post->id}", JobPostInput::for($user))->assertNotFound();
    $this->patch("/dashboard/jobs/{$post->id}/status")->assertNotFound();
    $this->patch("/dashboard/jobs/{$post->id}/archive")->assertNotFound();

    expect($post->fresh()->status->value)->toBe('pending');
    $this->assertDatabaseCount('audit_logs', 0);
})->with(['colleague', 'foreign agency']);

test('close and open round trip records the actor and a success toast', function () {
    $user = User::factory()->admin()->forAgency(Agency::factory()->create())->create();
    $post = JobPost::factory()->forPoster($user)->create();

    $this->actingAs($user)->patch("/dashboard/jobs/{$post->id}/status")
        ->assertRedirect()->assertInertiaFlash('toast.message', 'Job post closed.');
    expect($post->fresh()->status->value)->toBe('closed');
    $this->patch("/dashboard/jobs/{$post->id}/status")
        ->assertRedirect()->assertInertiaFlash('toast.message', 'Job post opened.');
    expect($post->fresh()->status->value)->toBe('pending');
    foreach (['closed', 'opened'] as $action) {
        $this->assertDatabaseHas('audit_logs', ['actor_user_id' => $user->id, 'subject_id' => $post->id, 'action' => 'job_post.'.$action]);
    }
});

test('archiving preserves the post and rejects further edits and status changes', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $post = JobPost::factory()->forPoster($user)->create();
    $input = JobPostInput::for($user);

    $this->actingAs($user)->patch("/dashboard/jobs/{$post->id}/archive")
        ->assertRedirect()->assertInertiaFlash('toast.message', 'Job post archived.');
    expect($post->fresh()->status->value)->toBe('archived');
    $this->assertDatabaseHas('audit_logs', ['actor_user_id' => $user->id, 'subject_id' => $post->id, 'action' => 'job_post.archived']);
    $this->get("/dashboard/jobs/{$post->id}/edit")->assertForbidden();
    $this->put("/dashboard/jobs/{$post->id}", $input)->assertForbidden();
    $this->patch("/dashboard/jobs/{$post->id}/status")->assertForbidden();
    expect($post->fresh()->status->value)->toBe('archived');
    $this->assertDatabaseCount('audit_logs', 1);
});

test('updates preserve answered questions and update submitted questions in place', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $post = JobPost::factory()->forPoster($user)->create();
    $questions = $post->questions()->createMany(array_map(fn (array $question): array => [...$question, 'question_text' => trim($question['question_text'])], JobPostInput::questions(4)));
    $application = Application::factory()->for($post)->create();
    foreach ([$questions[0], $questions[1]] as $question) {
        ApplicationAnswer::create(['application_id' => $application->id, 'job_post_question_id' => $question->id, 'answer_text' => 'yes']);
    }
    $input = JobPostInput::for($user);
    $input['questions'] = [
        ['id' => $questions[0]->id, 'question_text' => 'Updated question', 'answer_type' => 'yesno', 'is_required' => true],
        ['id' => $questions[3]->id, 'question_text' => 'Moved question', 'answer_type' => 'short'],
        ['question_text' => 'New question', 'answer_type' => 'short'],
    ];

    $this->actingAs($user)->put("/dashboard/jobs/{$post->id}", $input)->assertRedirect(route('dashboard.jobs'));

    expect($questions[0]->fresh()->question_text)->toBe('Updated question');
    expect($questions[1]->fresh()->deleted_at)->toBeNull();
    expect($questions[3]->fresh()->sort_order)->toBe(1);
    expect($questions[3]->fresh()->expected_answer)->toBeNull();
    $this->assertSoftDeleted($questions[2]);
    expect($post->questions()->count())->toBe(4);
    $this->assertDatabaseCount('application_answers', 2);
});

test('updates reject foreign question ids and duplicate ids', function (string $case) {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $post = JobPost::factory()->forPoster($user)->create();
    $owner = $case === 'foreign' ? JobPost::factory()->create() : $post;
    $question = $owner->questions()->create(['question_text' => 'Original', 'answer_type' => 'short', 'sort_order' => 0]);
    $input = JobPostInput::for($user);
    $input['questions'] = [['id' => $question->id, 'question_text' => 'Changed', 'answer_type' => 'short']];
    if ($case === 'duplicate') {
        $input['questions'][] = ['id' => $question->id, 'question_text' => 'Another', 'answer_type' => 'short'];
    }

    $this->actingAs($user)->put("/dashboard/jobs/{$post->id}", $input)->assertSessionHasErrors('questions.0.id');

    expect($question->fresh()->question_text)->toBe('Original');
})->with(['foreign', 'duplicate']);

test('updates apply the same employer and pathway checks as creation', function (string $case) {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create(['pathway' => 'landbased']))->create();
    $post = JobPost::factory()->forPoster($user)->create();
    $input = JobPostInput::for($user);
    if ($case === 'employer') {
        $input['employer_id'] = Employer::factory()->create()->id;
    } else {
        $input['job_subcategory_id'] = JobSubcategory::factory()->for(JobCategory::factory()->state(['pathway' => 'seabased']), 'category')->create()->id;
    }

    $this->actingAs($user)->put("/dashboard/jobs/{$post->id}", $input)->assertSessionHasErrors($case === 'employer' ? 'employer_id' : 'job_subcategory_id');

    expect($post->fresh()->job_title)->toBe($post->job_title);
    $this->assertDatabaseCount('audit_logs', 0);
})->with(['employer', 'pathway']);

test('management endpoints require authentication and managejob permission', function () {
    $post = JobPost::factory()->create();
    $this->get("/dashboard/jobs/{$post->id}/edit")->assertRedirect(route('login'));
    $this->put("/dashboard/jobs/{$post->id}")->assertRedirect(route('login'));
    $this->patch("/dashboard/jobs/{$post->id}/status")->assertRedirect(route('login'));
    $this->patch("/dashboard/jobs/{$post->id}/archive")->assertRedirect(route('login'));
    $user = User::factory()->forAgency($post->agency)->create();
    $user->givePermissionTo(['access dashboard', 'view jobs']);
    $this->actingAs($user)->get("/dashboard/jobs/{$post->id}/edit")->assertForbidden();
    $this->put("/dashboard/jobs/{$post->id}")->assertForbidden();
    $this->patch("/dashboard/jobs/{$post->id}/status")->assertForbidden();
    $this->patch("/dashboard/jobs/{$post->id}/archive")->assertForbidden();
});

test('authorization rejects inaccessible or archived posts before validating an update', function (string $case) {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $post = $case === 'archived' ? JobPost::factory()->forPoster($user)->archived()->create() : JobPost::factory()->create();

    $response = $this->actingAs($user)->put("/dashboard/jobs/{$post->id}", []);
    $case === 'archived' ? $response->assertForbidden() : $response->assertNotFound();
})->with(['archived', 'foreign']);

test('superadmins edit visible posts using the owning agency form choices', function () {
    $user = User::factory()->superadmin()->create();
    $poster = User::factory()->agency()->forAgency(Agency::factory()->create(['pathway' => 'seabased']))->create();
    $post = JobPost::factory()->forPoster($poster)->create();

    $this->actingAs($user)->get("/dashboard/jobs/{$post->id}/edit")->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->where('agency.id', $poster->agency_id));
    $this->put("/dashboard/jobs/{$post->id}", JobPostInput::for($poster))->assertRedirect(route('dashboard.jobs'));

    expect($post->fresh()->agency_id)->toBe($poster->agency_id);
});

test('question synchronization failures roll back updates and languages', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $post = JobPost::factory()->forPoster($user)->create(['job_title' => 'Original']);
    $this->partialMock(JobPostRepository::class)->shouldReceive('syncQuestions')->once()->andThrow(new RuntimeException('private failure'));
    Exceptions::fake();

    $this->actingAs($user)->put("/dashboard/jobs/{$post->id}", JobPostInput::for($user))
        ->assertRedirect()->assertInertiaFlash('toast.message', 'Something went wrong. Your job post was not changed. Please try again.');

    expect($post->fresh()->job_title)->toBe('Original');
    $this->assertDatabaseCount('job_post_languages', 0);
    $this->assertDatabaseCount('audit_logs', 0);
    Exceptions::assertReported(RuntimeException::class);
});

test('job post factory supplies numbers only to joborder posts', function () {
    $post = JobPost::factory()->create();
    $manpooling = JobPost::factory()->manpooling()->create();

    expect($post->job_order_number)->toStartWith('JO-');
    expect($manpooling->job_order_number)->toBeNull();
});

test('an archived employer stays prefilled but can be cleared before saving', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $employer = Employer::factory()->for($user->agency)->create(['deleted_at' => now()]);
    $post = JobPost::factory()->forPoster($user)->create(['employer_id' => $employer->id]);
    $input = JobPostInput::for($user);
    $input['employer_id'] = $employer->id;

    $this->actingAs($user)->get("/dashboard/jobs/{$post->id}/edit")->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->where('jobPost.employer_id', $employer->id)->has('employers', 0));
    $this->put("/dashboard/jobs/{$post->id}", $input)->assertSessionHasErrors('employer_id');
    $input['employer_id'] = null;
    $this->put("/dashboard/jobs/{$post->id}", $input)->assertRedirect(route('dashboard.jobs'));

    expect($post->fresh()->employer_id)->toBeNull();
});
