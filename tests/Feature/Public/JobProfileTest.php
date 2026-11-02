<?php

use App\Enums\Pathway;
use App\Models\Application;
use App\Models\Employer;
use App\Models\User;
use App\Support\PublicAgencyRules;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\PublicCatalog;

test('an active job post renders with its agency, other jobs and job order details', function () {
    $agency = PublicCatalog::agency(Pathway::Landbased, ['agency_name' => 'Northwind Manpower']);
    $employer = Employer::factory()->for($agency)->create(['employer_name' => 'Doha Clinic', 'employer_license_number' => 'LIC-1']);
    $post = PublicCatalog::post($agency, ['job_title' => 'Staff Nurse', 'employer_id' => $employer->id, 'job_order_number' => 'JO-2026-000001']);
    PublicCatalog::posts($agency, PublicAgencyRules::OTHER_JOBS_FROM_AGENCY_LIMIT + 2);
    PublicCatalog::hire($post, 2);

    $this->get(route('jobs.show', $post->id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('jobs/show')
            ->where('jobPost.id', (string) $post->id)
            ->where('jobPost.title', 'Staff Nurse')
            ->where('jobPost.employer', 'Doha Clinic')
            ->where('jobPost.employerDetails.licenseNumber', 'LIC-1')
            ->where('jobPost.jobOrderNumber', 'JO-2026-000001')
            ->where('jobPost.isAcceptingApplications', true)
            ->where('agency.name', 'Northwind Manpower')
            ->where('agency.topHirer', true)
            ->where('agency.hiredCount', 2)
            ->has('otherJobsFromAgency', PublicAgencyRules::OTHER_JOBS_FROM_AGENCY_LIMIT)
            ->where('otherJobsFromAgency', fn ($jobs) => ! collect($jobs)->pluck('id')->contains((string) $post->id))
            ->where('relatedJobs', []));
});

test('similar jobs from other agencies fill in when the agency has few other openings', function () {
    $agency = PublicCatalog::agency(Pathway::Seabased);
    $post = PublicCatalog::post($agency);
    $other = PublicCatalog::agency(Pathway::Seabased);
    PublicCatalog::posts($other, PublicAgencyRules::RELATED_JOBS_LIMIT + 2, ['job_subcategory_id' => $post->job_subcategory_id]);
    PublicCatalog::post(PublicCatalog::agency(Pathway::Seabased), ['job_subcategory_id' => PublicCatalog::subcategory(Pathway::Seabased)->id]);

    $this->get(route('jobs.show', $post->id))
        ->assertInertia(fn (Assert $page) => $page
            ->where('otherJobsFromAgency', [])
            ->has('relatedJobs', PublicAgencyRules::RELATED_JOBS_LIMIT)
            ->where('relatedJobs', fn ($jobs) => collect($jobs)->every(fn (array $job): bool => $job['agencySlug'] === $other->slug)));
});

test('a manpooling job profile carries no employer, licence or job order details', function () {
    $agency = PublicCatalog::agency();
    $employer = Employer::factory()->for($agency)->create([
        'employer_name' => 'Hidden Refinery', 'employer_location' => 'Ras Tanura', 'employer_license_number' => 'HIDDEN-LIC',
    ]);
    $post = PublicCatalog::post($agency, [
        'recruitment_type' => 'manpooling', 'job_order_number' => null, 'employer_id' => $employer->id,
        'work_location' => 'Ras Tanura Site, Saudi Arabia',
    ]);

    $response = $this->get(route('jobs.show', $post->id));

    $response->assertInertia(fn (Assert $page) => $page
        ->where('jobPost.employerHidden', true)
        ->where('jobPost.employer', null)
        ->where('jobPost.employerDetails', null)
        ->where('jobPost.jobOrderNumber', null)
        ->where('jobPost.location', 'Saudi Arabia'));

    expect($response->getContent())->not->toContain('Hidden Refinery')->not->toContain('Ras Tanura')->not->toContain('HIDDEN-LIC');
});

test('job posts the public may not see render the not found state', function (string $state) {
    $agency = PublicCatalog::agency(attributes: $state === 'suspended agency' ? ['suspended_at' => now()] : []);
    $post = PublicCatalog::post($agency, match ($state) {
        'closed' => ['status' => 'closed'],
        'archived' => ['status' => 'archived'],
        'expired' => ['closing_date' => now()->subDay()->toDateString()],
        default => [],
    });
    if ($state === 'deleted agency') {
        $agency->delete();
    }

    $this->get(route('jobs.show', $post->id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('jobs/show')->where('jobPost', null)->missing('agency'));
})->with(['closed', 'archived', 'expired', 'suspended agency', 'deleted agency']);

test('unknown and malformed job ids render the not found state', function (string $id) {
    $this->get('/job/'.$id)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('jobPost', null));
})->with(['999999', 'land-1', '1234567890123456789012']);

test('an applicant still sees a closed job post they applied to, but not an archived one', function () {
    $agency = PublicCatalog::agency();
    $closed = PublicCatalog::post($agency, ['status' => 'closed']);
    $archived = PublicCatalog::post($agency, ['status' => 'archived']);
    $applicant = User::factory()->applicant()->create();
    Application::factory()->for($closed, 'jobPost')->create(['applicant_user_id' => $applicant->id]);
    Application::factory()->for($archived, 'jobPost')->create(['applicant_user_id' => $applicant->id]);

    $this->actingAs($applicant)->get(route('jobs.show', $closed->id))
        ->assertInertia(fn (Assert $page) => $page
            ->where('jobPost.id', (string) $closed->id)
            ->where('jobPost.displayStatus', 'closed')
            ->where('jobPost.isAcceptingApplications', false));

    $this->actingAs($applicant)->get(route('jobs.show', $archived->id))
        ->assertInertia(fn (Assert $page) => $page->where('jobPost', null));

    $this->actingAs(User::factory()->applicant()->create())->get(route('jobs.show', $closed->id))
        ->assertInertia(fn (Assert $page) => $page->where('jobPost', null));
});
