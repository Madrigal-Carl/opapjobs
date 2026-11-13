<?php

use App\Enums\ApplicationStage;
use App\Enums\Availability;
use App\Models\Agency;
use App\Models\ApplicantDocument;
use App\Models\Application;
use App\Models\ApplicationStageHistory;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

function applicationDetailContext(): array
{
    $poster = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $post = JobPost::factory()->forPoster($poster)->create([
        'job_title' => 'Welder', 'work_location' => 'Riyadh, Saudi Arabia', 'vacant_positions' => 3,
    ]);
    $applicant = User::factory()->applicant()->create(['name' => 'Maria Santos', 'email' => 'maria@example.com']);
    $applicant->applicantProfile()->create([
        'headline' => 'Certified welder', 'phone_number' => '+63 917 555 0100',
        'current_location' => 'Cebu, Philippines', 'professional_summary' => 'Ten years of structural welding.',
        'availability' => Availability::Immediately, 'preferred_pathway' => 'landbased',
    ]);

    return [$poster, $post, $applicant];
}

test('the application detail page exposes the applicant, job, answers and ordered history', function () {
    [$poster, $post, $applicant] = applicationDetailContext();
    $first = $post->questions()->create([
        'question_text' => 'Do you hold a valid passport?', 'answer_type' => 'yesno', 'is_required' => true, 'sort_order' => 0,
    ]);
    $second = $post->questions()->create([
        'question_text' => 'Years of welding experience', 'answer_type' => 'short', 'is_required' => true, 'sort_order' => 1,
    ]);
    $application = Application::factory()->for($post)->for($applicant, 'applicant')->reviewed()->create([
        'submitted_at' => '2026-10-01 09:30:00', 'cover_letter' => 'Please consider my application.',
        'expected_monthly_salary' => '50000.00', 'availability' => Availability::Immediately,
    ]);
    $application->answers()->create(['job_post_question_id' => $first->id, 'answer_text' => 'Yes']);
    $application->answers()->create(['job_post_question_id' => $second->id, 'answer_text' => '10 years']);
    ApplicationStageHistory::create([
        'application_id' => $application->id, 'from_stage' => null, 'to_stage' => ApplicationStage::Pending,
        'note' => 'Submitted', 'created_at' => '2026-10-01 09:30:00',
    ]);
    ApplicationStageHistory::create([
        'application_id' => $application->id, 'from_stage' => ApplicationStage::Pending,
        'to_stage' => ApplicationStage::Reviewed, 'changed_by_user_id' => $poster->id,
        'note' => 'Screened', 'created_at' => '2026-10-02 10:00:00',
    ]);

    $this->actingAs($poster)->get(route('dashboard.applications.show', $application))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('dashboard/applications/show')
        ->where('application.id', $application->id)
        ->where('application.stage', 'reviewed')
        ->where('application.cover_letter', 'Please consider my application.')
        ->where('application.expected_monthly_salary', '50000.00')
        ->where('application.availability', 'immediately')
        ->where('application.applicant.name', 'Maria Santos')
        ->where('application.applicant.initials', 'MS')
        ->where('application.applicant.email', 'maria@example.com')
        ->where('application.applicant.phone', '+63 917 555 0100')
        ->where('application.applicant.pathway', 'landbased')
        ->where('application.job.title', 'Welder')
        ->where('application.job.location', 'Riyadh, Saudi Arabia')
        ->where('application.job.vacancies', 3)
        ->where('application.job.salary', 'Competitive salary')
        ->where('application.job.posted_by_user_id', $poster->id)
        ->where('application.job.agency_id', $poster->agency_id)
        ->where('application.job.poster_is_admin', false)
        ->has('application.questions', 2)
        ->where('application.questions.0.id', $first->id)
        ->where('application.questions.0.answer', 'Yes')
        ->where('application.questions.1.id', $second->id)
        ->where('application.questions.1.answer', '10 years')
        ->has('application.history', 2)
        ->where('application.history.0.from_stage', null)
        ->where('application.history.0.stage', 'pending')
        ->where('application.history.0.changed_by', null)
        ->where('application.history.1.from_stage', 'pending')
        ->where('application.history.1.stage', 'reviewed')
        ->where('application.history.1.changed_by', $poster->name)
        ->where('application.history.1.note', 'Screened')
        ->where('application.can_manage', true)
        ->where('application.can_proceed', true)
        ->where('application.next_stage', 'shortlisted')
        ->where('application.can_reject', true));
});

test('screening answers keep answered questions that were later deleted', function () {
    [$poster, $post, $applicant] = applicationDetailContext();
    $answered = $post->questions()->create([
        'question_text' => 'Answered before deletion', 'answer_type' => 'short', 'is_required' => false, 'sort_order' => 0,
    ]);
    $unanswered = $post->questions()->create([
        'question_text' => 'Deleted without an answer', 'answer_type' => 'short', 'is_required' => false, 'sort_order' => 1,
    ]);
    $application = Application::factory()->for($post)->for($applicant, 'applicant')->create();
    $application->answers()->create(['job_post_question_id' => $answered->id, 'answer_text' => 'Kept']);
    $answered->delete();
    $unanswered->delete();

    $this->actingAs($poster)->get(route('dashboard.applications.show', $application))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('application.questions', 1)
        ->where('application.questions.0.id', $answered->id)
        ->where('application.questions.0.answer', 'Kept'));
});

test('application details include stored job requirements and document context without private paths or profile history', function () {
    Storage::fake('local');
    [$poster, $post, $applicant] = applicationDetailContext();
    $post->update([
        'salary_currency' => 'SAR', 'job_order_number' => 'JO-2026-0100',
        'gender_requirement' => 'any', 'required_documents' => ['Valid passport', 'Trade certificate'],
        'application_instructions' => 'Bring original certificates to the interview.',
        'contact_person_name' => 'Hiring coordinator', 'contact_email' => 'hiring@example.test',
        'contact_phone' => '+63 917 555 0200', 'is_urgent' => true,
    ]);
    $resume = ApplicantDocument::create([
        'applicant_user_id' => $applicant->id, 'document_type' => 'resume',
        'original_file_name' => 'Submitted CV.pdf', 'storage_path' => 'private/selected-cv.pdf',
        'mime_type' => 'application/pdf', 'file_size_bytes' => 2048,
        'is_primary' => false, 'uploaded_at' => '2026-09-30 08:00:00',
    ]);
    $application = Application::factory()->for($post)->for($applicant, 'applicant')->create([
        'submitted_at' => '2026-10-01 09:30:00', 'resume_document_id' => $resume->id,
        'expected_monthly_salary' => '0.00',
    ]);

    $this->actingAs($poster)->get(route('dashboard.applications.show', $application))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('application.expected_monthly_salary', '0.00')
        ->where('application.job.salary_currency', 'SAR')
        ->where('application.job.job_order_number', 'JO-2026-0100')
        ->where('application.job.gender_requirement', 'any')
        ->where('application.job.required_documents', ['Valid passport', 'Trade certificate'])
        ->where('application.job.application_instructions', 'Bring original certificates to the interview.')
        ->where('application.job.contact_person_name', 'Hiring coordinator')
        ->where('application.job.contact_email', 'hiring@example.test')
        ->where('application.job.contact_phone', '+63 917 555 0200')
        ->where('application.job.status', 'active')
        ->where('application.job.is_urgent', true)
        ->where('application.resume_document_id', $resume->id)
        ->where('application.documents.0.document_type', 'resume')
        ->missing('application.documents.0.storage_path')
        ->missing('application.applicant.default_cover_letter')
        ->missing('application.applicant.avatar_path')
        ->missing('application.applicant.summary')
        ->missing('application.experiences')
        ->missing('application.education')
        ->missing('application.certifications')
        ->missing('application.skills'));
});

test('documents are limited to files uploaded before submission and only link files that exist', function () {
    Storage::fake('local');
    Storage::disk('local')->put('resumes/cv.pdf', 'resume contents');
    [$poster, $post, $applicant] = applicationDetailContext();
    $submittedAt = '2026-10-01 09:30:00';
    $application = Application::factory()->for($post)->for($applicant, 'applicant')->create(['submitted_at' => $submittedAt]);
    $existing = ApplicantDocument::create([
        'applicant_user_id' => $applicant->id, 'document_type' => 'certificate',
        'original_file_name' => 'Passport copy.pdf', 'storage_path' => 'resumes/cv.pdf',
        'mime_type' => 'application/pdf', 'file_size_bytes' => 2048,
        'is_primary' => false, 'uploaded_at' => '2026-09-30 08:00:00',
    ]);
    ApplicantDocument::create([
        'applicant_user_id' => $applicant->id, 'document_type' => 'other',
        'original_file_name' => 'Missing.pdf', 'storage_path' => 'resumes/missing.pdf',
        'mime_type' => 'application/pdf', 'file_size_bytes' => 1024,
        'is_primary' => false, 'uploaded_at' => '2026-09-30 09:00:00',
    ]);
    $late = ApplicantDocument::create([
        'applicant_user_id' => $applicant->id, 'document_type' => 'other',
        'original_file_name' => 'Late.pdf', 'storage_path' => 'resumes/cv.pdf',
        'mime_type' => 'application/pdf', 'file_size_bytes' => 1024,
        'is_primary' => false, 'uploaded_at' => '2026-10-02 09:00:00',
    ]);
    $deleted = ApplicantDocument::create([
        'applicant_user_id' => $applicant->id, 'document_type' => 'other',
        'original_file_name' => 'Deleted.pdf', 'storage_path' => 'resumes/cv.pdf',
        'mime_type' => 'application/pdf', 'file_size_bytes' => 1024,
        'is_primary' => false, 'uploaded_at' => '2026-09-30 10:00:00',
    ]);
    $deleted->delete();

    $this->actingAs($poster)->get(route('dashboard.applications.show', $application))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('application.documents', 2)
        ->where('application.documents.0.id', $existing->id)
        ->where('application.documents.0.size', '2 KB')
        ->where('application.documents.0.url', route('dashboard.applications.documents', ['application' => $application->id, 'document' => $existing->id], absolute: false))
        ->where('application.documents.1.url', null));

    $this->get(route('dashboard.applications.documents', ['application' => $application->id, 'document' => $existing->id]))
        ->assertOk()->assertDownload('Passport copy.pdf');
    $this->get(route('dashboard.applications.documents', ['application' => $application->id, 'document' => $late->id]))
        ->assertNotFound();
});

test('documents that do not belong to the visible application return not found', function () {
    [$poster, $post, $applicant] = applicationDetailContext();
    $application = Application::factory()->for($post)->for($applicant, 'applicant')->create();
    $otherApplicant = User::factory()->applicant()->create();
    $document = ApplicantDocument::create([
        'applicant_user_id' => $otherApplicant->id, 'document_type' => 'certificate',
        'original_file_name' => 'Foreign.pdf', 'storage_path' => 'resumes/foreign.pdf',
        'mime_type' => 'application/pdf', 'file_size_bytes' => 1024,
        'is_primary' => false, 'uploaded_at' => now()->subDay(),
    ]);

    $this->actingAs($poster)->get(route('dashboard.applications.documents', ['application' => $application->id, 'document' => $document->id]))
        ->assertNotFound();
});

test('applications outside the viewer scope return not found', function () {
    $user = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $foreignPoster = User::factory()->agency()->forAgency(Agency::factory()->create())->create();
    $application = Application::factory()->for(JobPost::factory()->forPoster($foreignPoster))->create();

    $this->actingAs($user)->get(route('dashboard.applications.show', $application))->assertNotFound();
    $this->actingAs($user)->get(route('dashboard.applications.show', 999999))->assertNotFound();
});
