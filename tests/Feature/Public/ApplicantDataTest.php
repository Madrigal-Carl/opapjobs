<?php

use App\Enums\Pathway;
use App\Models\Application;
use App\Models\JobPostQuestion;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\PublicCatalog;

beforeEach(function () {
    $this->applicant = User::factory()->applicant()->create(['name' => 'Mariel Santos']);
});

function savePost(User $applicant, int $jobPostId, string $savedAt = 'now'): void
{
    DB::table('saved_job_posts')->insert([
        'applicant_user_id' => $applicant->id, 'job_post_id' => $jobPostId, 'created_at' => now()->modify($savedAt),
    ]);
}

test('applicant activity comes from the database and is shared only with applicants', function () {
    $agency = PublicCatalog::agency();
    $applied = PublicCatalog::post($agency);
    $archived = PublicCatalog::post($agency);
    $saved = PublicCatalog::post($agency);
    Application::factory()->for($applied, 'jobPost')->create(['applicant_user_id' => $this->applicant->id]);
    Application::factory()->for($archived, 'jobPost')->create(['applicant_user_id' => $this->applicant->id, 'applicant_archived_at' => now()]);
    savePost($this->applicant, $saved->id);

    $this->actingAs($this->applicant)->get(route('jobs.index'))
        ->assertInertia(fn (Assert $page) => $page->where('applicantActivity', [
            'applied' => [(string) $applied->id], 'saved' => [(string) $saved->id], 'archived' => [(string) $archived->id],
        ]));

    app('auth')->forgetGuards();
    $this->get(route('jobs.index'))->assertInertia(fn (Assert $page) => $page->where('applicantActivity', null));
});

test('staff and users without a role never get applicant activity', function (string $state) {
    $user = $state === 'no role' ? User::factory()->create() : User::factory()->{$state}()->create();

    // Staff are sent away from the public pages, so they are checked on their settings page.
    $this->actingAs($user)->get(route($state === 'no role' ? 'agencies.index' : 'profile.edit'))
        ->assertInertia(fn (Assert $page) => $page->where('applicantActivity', null));
})->with(['agency', 'admin', 'superadmin', 'no role']);

test('my jobs lists applications, saved and archived job posts from the database', function () {
    $agency = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Kalinaw Overseas Staffing']);
    $older = PublicCatalog::post($agency, ['job_title' => 'Older Application']);
    $newer = PublicCatalog::post($agency, ['job_title' => 'Newer Application', 'status' => 'closed']);
    $archived = PublicCatalog::post($agency, ['job_title' => 'Archived Application']);
    $saved = PublicCatalog::post($agency, ['job_title' => 'Saved Job']);
    $hiddenJob = PublicCatalog::post($agency, ['job_title' => 'Archived Job Post', 'status' => 'archived']);
    $suspendedJob = PublicCatalog::post(PublicCatalog::agency(attributes: ['suspended_at' => now()]), ['job_title' => 'Suspended Agency Job']);

    Application::factory()->for($older, 'jobPost')->create(['applicant_user_id' => $this->applicant->id, 'stage' => 'shortlisted', 'submitted_at' => now()->subDays(3)]);
    Application::factory()->for($newer, 'jobPost')->create(['applicant_user_id' => $this->applicant->id, 'submitted_at' => now()->subDay()]);
    Application::factory()->for($archived, 'jobPost')->create(['applicant_user_id' => $this->applicant->id, 'applicant_archived_at' => now()]);
    Application::factory()->for($hiddenJob, 'jobPost')->create(['applicant_user_id' => $this->applicant->id]);
    Application::factory()->for($suspendedJob, 'jobPost')->create(['applicant_user_id' => $this->applicant->id]);
    Application::factory()->for($saved, 'jobPost')->create();
    savePost($this->applicant, $saved->id);

    $this->actingAs($this->applicant)->get(route('applications'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('applicant/applications')
            ->where('applied', fn ($rows) => collect($rows)->pluck('title')->all() === ['Newer Application', 'Older Application'])
            ->where('applied.0.isAcceptingApplications', false)
            ->where('applied.0.displayStatus', 'closed')
            ->where('applied.1.applicationStage', 'shortlisted')
            ->where('applied.1.agency', 'Kalinaw Overseas Staffing')
            ->has('saved', 1)
            ->where('saved.0.title', 'Saved Job')
            ->where('saved.0.applicationStage', null)
            ->where('saved.0.isAcceptingApplications', true)
            ->has('archived', 1)
            ->where('archived.0.title', 'Archived Application'));
});

test('my jobs only shows the signed-in applicant their own rows', function () {
    $post = PublicCatalog::post(PublicCatalog::agency());
    Application::factory()->for($post, 'jobPost')->create();
    savePost(User::factory()->applicant()->create(), $post->id);

    $this->actingAs($this->applicant)->get(route('applications'))
        ->assertInertia(fn (Assert $page) => $page->where('applied', [])->where('saved', [])->where('archived', []));
});

test('the resume page reads the applicant profile and resume sections from the database', function () {
    $this->applicant->applicantProfile()->create([
        'headline' => 'Electrical Technician', 'phone_number' => '+63 900 000 2001', 'current_location' => 'Cebu City, Philippines',
        'professional_summary' => 'Eight years on switchgear.', 'default_cover_letter' => 'Please consider me.', 'is_visible_to_agencies' => false,
    ]);
    $this->applicant->experiences()->create([
        'job_role' => 'Electrician', 'company_name' => 'Meralco', 'started_on' => '2019-03-01', 'ended_on' => null,
        'work_location' => 'Manila, Philippines', 'responsibilities' => 'Substation maintenance.', 'sort_order' => 0,
    ]);
    $this->applicant->education()->create([
        'school_name' => 'TESDA', 'degree' => 'NC II', 'field_of_study' => 'Electrical', 'started_on' => '2017-01-01', 'ended_on' => '2017-12-01', 'sort_order' => 0,
    ]);
    $this->applicant->skills()->create(['skill_name' => 'PLC Troubleshooting', 'skill_level' => 'advanced', 'sort_order' => 0]);
    $this->applicant->documents()->create([
        'document_type' => 'resume', 'original_file_name' => 'resume.pdf', 'storage_path' => 'resumes/a.pdf',
        'mime_type' => 'application/pdf', 'file_size_bytes' => 190_000, 'is_primary' => true, 'uploaded_at' => '2026-09-14 10:00:00',
    ]);
    $this->applicant->documents()->create([
        'document_type' => 'resume', 'original_file_name' => 'old.pdf', 'storage_path' => 'resumes/b.pdf',
        'mime_type' => 'application/pdf', 'file_size_bytes' => 1000, 'is_primary' => false, 'uploaded_at' => now(),
    ])->delete();

    $response = $this->actingAs($this->applicant)->get(route('resume'));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('applicant/resume')
        ->where('resume.name', 'Mariel Santos')
        ->where('resume.headline', 'Electrical Technician')
        ->where('resume.location', 'Cebu City, Philippines')
        ->where('resume.visibleToEmployers', false)
        ->where('resume.coverLetter', 'Please consider me.')
        ->where('resume.experiences.0.start', 'Mar 2019')
        ->where('resume.experiences.0.end', '')
        ->where('resume.education.0.start', '2017')
        ->where('resume.skills.0.level', 'Advanced')
        ->has('resume.documents', 1)
        ->where('resume.documents.0.name', 'resume.pdf')
        ->where('resume.documents.0.size', '186 KB')
        ->where('resume.documents.0.uploadedAt', 'Sep 14, 2026')
        ->where('resume.documents.0.url', ''));

    expect($response->getContent())->not->toContain('resumes/a.pdf');
});

test('an applicant without a profile gets an empty resume', function () {
    $this->actingAs($this->applicant)->get(route('resume'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('resume.headline', '')
            ->where('resume.experiences', [])
            ->where('resume.documents', []));
});

test('the apply page loads the job post and its questions without the expected answers', function () {
    $post = PublicCatalog::post(PublicCatalog::agency(), ['job_title' => 'Staff Nurse']);
    JobPostQuestion::query()->create([
        'job_post_id' => $post->id, 'question_text' => 'Do you hold a valid PRC licence?', 'answer_type' => 'yesno',
        'expected_answer' => 'SECRET-EXPECTED', 'is_required' => true, 'sort_order' => 1,
    ]);
    JobPostQuestion::query()->create([
        'job_post_id' => $post->id, 'question_text' => 'Years in an ICU?', 'answer_type' => 'short',
        'expected_answer' => 'SECRET-TWO', 'is_required' => false, 'sort_order' => 0,
    ]);

    $response = $this->actingAs($this->applicant)->get(route('jobs.apply', $post->id));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('jobs/apply')
        ->where('jobPost.title', 'Staff Nurse')
        ->where('jobPost.isAcceptingApplications', true)
        ->where('questions', fn ($questions) => collect($questions)->map(fn ($question) => [$question['label'], $question['type'], $question['required'], $question['answer']])->all() === [
            ['Years in an ICU?', 'short', false, ''],
            ['Do you hold a valid PRC licence?', 'yesno', true, ''],
        ])
        ->where('resume.name', 'Mariel Santos'));

    expect($response->getContent())->not->toContain('SECRET-EXPECTED')->not->toContain('SECRET-TWO');
});

test('the apply page shows not found for job posts the applicant may not see', function (string $state) {
    $post = PublicCatalog::post(PublicCatalog::agency(), $state === 'archived' ? ['status' => 'archived'] : ['status' => 'closed']);

    $this->actingAs($this->applicant)->get(route('jobs.apply', $state === 'unknown' ? 'land-1' : $post->id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('jobPost', null)->missing('questions'));
})->with(['closed without an application', 'archived', 'unknown']);

test('the apply page still opens a closed job post the applicant applied to, marked closed', function () {
    $post = PublicCatalog::post(PublicCatalog::agency(), ['status' => 'closed']);
    Application::factory()->for($post, 'jobPost')->create(['applicant_user_id' => $this->applicant->id]);

    $this->actingAs($this->applicant)->get(route('jobs.apply', $post->id))
        ->assertInertia(fn (Assert $page) => $page->where('jobPost.isAcceptingApplications', false));
});
