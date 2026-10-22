<?php

use App\Models\Agency;
use App\Models\Employer;
use App\Models\JobPost;
use App\Models\User;
use Tests\Support\JobPostInput;

test('duplicate warnings normalize titles cap results and obey visible scope', function () {
    $agency = Agency::factory()->create();
    $user = User::factory()->agency()->forAgency($agency)->create();
    $admin = User::factory()->admin()->forAgency($agency)->create();
    $input = JobPostInput::for($user);
    $employer = Employer::factory()->for($agency)->create();
    $attributes = ['job_title' => 'Senior  Electrician', 'job_subcategory_id' => $input['job_subcategory_id'], 'employer_id' => $employer->id];
    JobPost::factory()->forPoster($user)->count(6)->create($attributes);
    $colleague = JobPost::factory()->forPoster($admin)->create($attributes);
    JobPost::factory()->create($attributes);
    $query = ['job_title' => ' senior electrician ', 'job_subcategory_id' => $input['job_subcategory_id'], 'employer_id' => $employer->id];

    $this->actingAs($user)->getJson('/dashboard/jobs/duplicates?'.http_build_query($query))
        ->assertOk()->assertJsonCount(5, 'duplicates')
        ->assertJsonStructure(['duplicates' => [['id', 'job_title', 'created_at', 'display_status']]])
        ->assertJsonMissing(['id' => $colleague->id]);
    $this->actingAs($admin)->getJson('/dashboard/jobs/duplicates?'.http_build_query($query))
        ->assertOk()->assertJsonPath('duplicates.0.id', $colleague->id);
});

test('duplicate lookup handles no employer and rejects malformed query input', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $input = JobPostInput::for($user);
    $post = JobPost::factory()->forPoster($user)->create(['job_title' => 'Electrician', 'job_subcategory_id' => $input['job_subcategory_id']]);

    $this->actingAs($user)->getJson('/dashboard/jobs/duplicates?'.http_build_query(['job_title' => 'Electrician', 'job_subcategory_id' => $input['job_subcategory_id']]))
        ->assertOk()->assertJsonPath('duplicates.0.id', $post->id);
    $this->getJson('/dashboard/jobs/duplicates?job_title[]=bad&job_subcategory_id=invalid')
        ->assertUnprocessable()->assertJsonValidationErrors(['job_title', 'job_subcategory_id']);
});

test('editing excludes the current post from duplicate warnings', function (string $role) {
    $poster = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $user = $role === 'poster' ? $poster : User::factory()->superadmin()->create();
    $input = JobPostInput::for($poster);
    $attributes = ['job_title' => 'Electrician', 'job_subcategory_id' => $input['job_subcategory_id']];
    $post = JobPost::factory()->forPoster($poster)->create($attributes);
    $other = JobPost::factory()->forPoster($poster)->create($attributes);

    $this->actingAs($user)->getJson(route('dashboard.jobs.duplicates', [...$attributes, 'exclude_job_post_id' => $post->id]))
        ->assertOk()->assertJsonCount(1, 'duplicates')->assertJsonPath('duplicates.0.id', $other->id);
})->with(['poster', 'superadmin']);
