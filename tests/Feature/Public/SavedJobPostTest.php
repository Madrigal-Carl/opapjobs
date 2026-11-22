<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\PublicCatalog;

beforeEach(function () {
    $this->applicant = User::factory()->applicant()->create();
});

test('applicants save a job post, see it under Saved in My Jobs, and remove it again', function () {
    $post = PublicCatalog::post(PublicCatalog::agency(), ['job_title' => 'Staff Nurse']);

    $this->actingAs($this->applicant)->post(route('jobs.save', $post->id))->assertRedirect();
    // Saving twice keeps one bookmark.
    $this->post(route('jobs.save', $post->id))->assertRedirect();

    $this->assertDatabaseCount('saved_job_posts', 1);
    $this->get(route('applications'))->assertInertia(fn (Assert $page) => $page
        ->has('saved', 1)->where('saved.0.title', 'Staff Nurse')
        ->where('applicantActivity.saved', [(string) $post->id]));

    $this->delete(route('jobs.unsave', $post->id))->assertRedirect();

    $this->assertDatabaseCount('saved_job_posts', 0);
    $this->get(route('applications'))->assertInertia(fn (Assert $page) => $page->where('saved', []));
});

test('job posts the applicant cannot see cannot be saved', function (string $case) {
    $post = match ($case) {
        'archived' => PublicCatalog::post(PublicCatalog::agency(), ['status' => 'archived']),
        'suspended agency' => PublicCatalog::post(PublicCatalog::agency(attributes: ['suspended_at' => now()])),
        'unknown' => null,
    };

    $this->actingAs($this->applicant)->post(route('jobs.save', $post?->id ?? 999999))->assertNotFound();

    $this->assertDatabaseCount('saved_job_posts', 0);
})->with(['archived', 'suspended agency', 'unknown']);

test('removing a bookmark only touches the signed-in applicant\'s own', function () {
    $post = PublicCatalog::post(PublicCatalog::agency());
    $other = User::factory()->applicant()->create();
    $this->actingAs($other)->post(route('jobs.save', $post->id));

    $this->actingAs($this->applicant)->delete(route('jobs.unsave', $post->id))->assertRedirect();

    $this->assertDatabaseHas('saved_job_posts', ['applicant_user_id' => $other->id, 'job_post_id' => $post->id]);
});

test('guests are sent to sign in before saving a job post', function () {
    $post = PublicCatalog::post(PublicCatalog::agency());

    $this->post(route('jobs.save', $post->id))->assertRedirect(route('login'));

    $this->assertDatabaseCount('saved_job_posts', 0);
});
