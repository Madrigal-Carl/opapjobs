<?php

use App\Models\ApplicantDocument;
use App\Models\Application;
use App\Models\User;
use App\Repositories\Site\ApplicantRepository;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\PublicCatalog;

function submissionResume(User $user): ApplicantDocument
{
    $path = 'resumes/'.$user->id.'.pdf';
    Storage::disk('local')->put($path, '%PDF-1.4 resume');

    return $user->documents()->create([
        'document_type' => 'resume', 'original_file_name' => 'resume.pdf', 'storage_path' => $path,
        'mime_type' => 'application/pdf', 'file_size_bytes' => 15, 'is_primary' => true, 'uploaded_at' => now(),
    ]);
}

test('applicants submit their own resume and job answers and see the application in My Jobs', function () {
    Storage::fake('local');
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency());
    $resume = submissionResume($user);
    $yesno = $post->questions()->create(['question_text' => 'Licensed?', 'answer_type' => 'yesno', 'is_required' => true, 'sort_order' => 0]);
    $short = $post->questions()->create(['question_text' => 'Your experience?', 'answer_type' => 'short', 'is_required' => true, 'sort_order' => 1]);

    $this->actingAs($user)->post("/job/{$post->id}/apply", [
        'resume_document_id' => $resume->id, 'cover_letter' => 'Please consider my application.',
        'expected_monthly_salary' => '2500.50', 'availability' => 'within_2_weeks',
        'answers' => [$yesno->id => 'No', $short->id => 'Three years.'],
        'applicant_user_id' => User::factory()->applicant()->create()->id, 'stage' => 'endorsed',
    ])->assertRedirect(route('jobs.apply', $post->id))->assertSessionHasNoErrors();

    $application = Application::sole();
    expect($application->applicant_user_id)->toBe($user->id);
    expect($application->job_post_id)->toBe($post->id);
    expect($application->resume_document_id)->toBe($resume->id);
    expect($application->stage->value)->toBe('pending');
    expect($application->cover_letter)->toBe('Please consider my application.');
    expect($application->expected_monthly_salary)->toBeNull();
    expect($application->availability)->toBeNull();
    expect($application->answers->pluck('answer_text', 'job_post_question_id')->all())->toBe([$yesno->id => 'No', $short->id => 'Three years.']);
    expect($application->stageHistory->sole()->to_stage->value)->toBe('pending');
    $this->get(route('applications'))->assertOk()->assertInertia(fn (Assert $page) => $page->where('applied.0.id', (string) $post->id));
});

test('a job without screening questions accepts an application without answers', function () {
    Storage::fake('local');
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency());

    $this->actingAs($user)->post("/job/{$post->id}/apply", ['resume_document_id' => submissionResume($user)->id])
        ->assertRedirect(route('jobs.apply', $post->id))->assertSessionHasNoErrors();

    expect(Application::sole()->answers)->toBeEmpty();
    expect(Application::sole()->cover_letter)->toBeNull();
});

test('required PDFs are saved with their requirement names and are available only on that application', function () {
    Storage::fake('local');
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency(), ['required_documents' => ['NBI clearance', 'Police clearance']]);
    $resume = submissionResume($user);

    $this->actingAs($user)->post("/job/{$post->id}/apply", [
        'resume_document_id' => $resume->id,
        'documents' => [
            ['name' => 'Police clearance', 'file' => UploadedFile::fake()->create('police.pdf', 10, 'application/pdf')],
            ['name' => 'NBI clearance', 'file' => UploadedFile::fake()->create('nbi.pdf', 10, 'application/pdf')],
        ],
    ])->assertRedirect(route('jobs.apply', $post->id))->assertSessionHasNoErrors();

    $application = Application::sole();
    expect($application->supportingDocuments)->toHaveCount(2);
    $document = $application->supportingDocuments->firstWhere('original_file_name', 'nbi.pdf');
    expect($document->pivot->requirement_name)->toBe('NBI clearance');
    Storage::disk('local')->assertExists($document->storage_path);

    $this->actingAs($post->poster)->get(route('dashboard.applications.show', $application))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('application.documents', 3)->missing('application.documents.1.storage_path'));
    $this->get(route('dashboard.applications.documents', ['application' => $application->id, 'document' => $document->id]))
        ->assertOk()->assertDownload('nbi.pdf');

    $otherPost = PublicCatalog::post(PublicCatalog::agency());
    $otherApplication = Application::factory()->for($otherPost, 'jobPost')->create(['applicant_user_id' => $user->id, 'submitted_at' => now()->addMinute()]);
    $this->actingAs($otherPost->poster)->get(route('dashboard.applications.show', $otherApplication))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('application.documents', 1)->where('application.documents.0.id', $resume->id));
    $this->get(route('dashboard.applications.documents', ['application' => $otherApplication->id, 'document' => $document->id]))->assertNotFound();
});

test('every required PDF must be uploaded and unrequested documents are rejected', function (string $case) {
    Storage::fake('local');
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency(), ['required_documents' => ['NBI clearance', 'Police clearance']]);
    $documents = match ($case) {
        'missing all' => [],
        'missing one' => [['name' => 'NBI clearance', 'file' => UploadedFile::fake()->create('nbi.pdf', 10, 'application/pdf')]],
        'unexpected' => [['name' => 'Passport', 'file' => UploadedFile::fake()->create('passport.pdf', 10, 'application/pdf')]],
        'duplicate' => array_fill(0, 2, ['name' => 'NBI clearance', 'file' => UploadedFile::fake()->create('nbi.pdf', 10, 'application/pdf')]),
    };

    $this->actingAs($user)->post("/job/{$post->id}/apply", ['resume_document_id' => submissionResume($user)->id, 'documents' => $documents])
        ->assertSessionHasErrors();
    $this->assertDatabaseCount('applications', 0);
    expect(Storage::disk('local')->allFiles())->toBe(['resumes/'.$user->id.'.pdf']);
})->with(['missing all', 'missing one', 'unexpected', 'duplicate']);

test('supporting uploads accept only real PDFs within the size limit', function (string $case) {
    Storage::fake('local');
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency(), ['required_documents' => ['NBI clearance']]);
    $file = match ($case) {
        'image' => UploadedFile::fake()->create('nbi.png', 10, 'image/png'),
        'word' => UploadedFile::fake()->create('nbi.docx', 10, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        'oversized' => UploadedFile::fake()->create('nbi.pdf', 10241, 'application/pdf'),
        'disguised' => UploadedFile::fake()->createWithContent('nbi.pdf', '<html>Not a PDF</html>'),
    };
    $upload = $case === 'disguised' ? new UploadedFile($file->getPathname(), 'nbi.pdf', null, null, true) : $file;

    $this->actingAs($user)->post("/job/{$post->id}/apply", [
        'resume_document_id' => submissionResume($user)->id, 'documents' => [['name' => 'NBI clearance', 'file' => $upload]],
    ])->assertSessionHasErrors('documents.0.file');
    $this->assertDatabaseCount('applications', 0);
    expect(Storage::disk('local')->allFiles())->toBe(['resumes/'.$user->id.'.pdf']);
})->with(['image', 'word', 'oversized', 'disguised']);

test('submission failure removes every newly uploaded file and rolls back supporting documents', function () {
    Storage::fake('local');
    Exceptions::fake();
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency(), ['required_documents' => ['NBI', 'Police clearance']]);
    $this->partialMock(ApplicantRepository::class)->shouldReceive('createAnswers')->once()->andThrow(new RuntimeException('database failure'));

    $this->actingAs($user)->post("/job/{$post->id}/apply", [
        'resume' => UploadedFile::fake()->create('resume.pdf', 10, 'application/pdf'),
        'documents' => [
            ['name' => 'NBI', 'file' => UploadedFile::fake()->create('nbi.pdf', 10, 'application/pdf')],
            ['name' => 'Police clearance', 'file' => UploadedFile::fake()->create('police.pdf', 10, 'application/pdf')],
        ],
    ])->assertSessionHasErrors('application');
    $this->assertDatabaseCount('applications', 0);
    $this->assertDatabaseCount('applicant_documents', 0);
    expect(Storage::disk('local')->allFiles())->toBeEmpty();
    Exceptions::assertReported(RuntimeException::class);
});

test('job details browse previews and the apply page expose the required document list', function () {
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency(), ['required_documents' => ['NBI', 'Police clearance']]);
    $this->get(route('jobs.show', $post->id))->assertOk()->assertInertia(fn (Assert $page) => $page->where('jobPost.requiredDocuments', ['NBI', 'Police clearance']));
    $this->get(route('jobs.index'))->assertOk()->assertInertia(fn (Assert $page) => $page->where('jobPosts.0.requiredDocuments', ['NBI', 'Police clearance']));
    $this->actingAs($user)->get(route('jobs.apply', $post->id))->assertOk()->assertInertia(fn (Assert $page) => $page->where('jobPost.requiredDocuments', ['NBI', 'Police clearance']));
});

test('applicants answer saved numeric and single selection questions', function () {
    Storage::fake('local');
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency());
    $number = $post->questions()->create(['question_text' => 'Expected salary?', 'answer_type' => 'number', 'is_required' => true, 'sort_order' => 0]);
    $selection = $post->questions()->create(['question_text' => 'When can you start?', 'answer_type' => 'selection', 'options' => ['Immediately', 'Next month'], 'is_required' => true, 'sort_order' => 1]);

    $this->actingAs($user)->get(route('jobs.apply', $post->id))->assertInertia(fn (Assert $page) => $page
        ->where('questions.0.type', 'number')->where('questions.1.options', ['Immediately', 'Next month'])->missing('questions.1.expected_answer'));
    $this->post("/job/{$post->id}/apply", [
        'resume_document_id' => submissionResume($user)->id,
        'answers' => [$number->id => '2500.50', $selection->id => 'Next month'],
    ])->assertSessionHasNoErrors()->assertRedirect(route('jobs.apply', $post->id));

    expect(Application::sole()->answers->pluck('answer_text', 'job_post_question_id')->all())->toBe([$number->id => '2500.50', $selection->id => 'Next month']);
    expect(Application::sole()->expected_monthly_salary)->toBeNull();
    expect(Application::sole()->availability)->toBeNull();
});

test('numeric and selection answers enforce the saved question type', function (string $type, mixed $answer) {
    Storage::fake('local');
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency());
    $question = $post->questions()->create(['question_text' => 'Question?', 'answer_type' => $type, 'options' => $type === 'selection' ? ['Now', 'Later'] : null, 'is_required' => true, 'sort_order' => 0]);

    $this->actingAs($user)->post("/job/{$post->id}/apply", ['resume_document_id' => submissionResume($user)->id, 'answers' => [$question->id => $answer]])
        ->assertSessionHasErrors('answers.'.$question->id);
    $this->assertDatabaseCount('applications', 0);
})->with([
    ['number', 'not a number'], ['number', '2500 USD'], ['number', ''],
    ['selection', 'Unlisted choice'], ['selection', ['Now', 'Later']], ['selection', ''],
]);

test('submission validates current job questions rather than trusting the browser', function (string $case, string $field) {
    Storage::fake('local');
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency());
    $question = $post->questions()->create(['question_text' => 'Licensed?', 'answer_type' => 'yesno', 'is_required' => true, 'sort_order' => 0]);
    $input = ['resume_document_id' => submissionResume($user)->id, 'answers' => [$question->id => 'No']];
    if ($case === 'salary') {
        $question->update(['answer_type' => 'number']);
    } elseif ($case === 'availability') {
        $question->update(['answer_type' => 'selection', 'options' => ['Now', 'Later']]);
    }
    match ($case) {
        'missing answer' => $input['answers'] = [],
        'blank answer' => $input['answers'][$question->id] = '  ',
        'invalid yesno' => $input['answers'][$question->id] = 'Maybe',
        'array answer' => $input['answers'][$question->id] = ['No'],
        'foreign answer' => $input['answers'][999999] = 'Other job',
        'salary' => $input['answers'][$question->id] = 'ten dollars',
        'availability' => $input['answers'][$question->id] = 'whenever',
        'missing resume' => $input['resume_document_id'] = null,
    };
    $field = str_replace('{question}', (string) $question->id, $field);

    $this->actingAs($user)->from(route('jobs.apply', $post->id))->post("/job/{$post->id}/apply", $input)
        ->assertSessionHasErrors($field);

    $this->assertDatabaseCount('applications', 0);
    $this->assertDatabaseCount('application_answers', 0);
})->with([
    ['missing answer', 'answers.{question}'], ['blank answer', 'answers.{question}'],
    ['invalid yesno', 'answers.{question}'], ['array answer', 'answers.{question}'],
    ['foreign answer', 'answers'], ['salary', 'answers.{question}'],
    ['availability', 'answers.{question}'], ['missing resume', 'resume_document_id'],
]);

test('applicants cannot use foreign archived non-resume or missing files', function (string $case) {
    Storage::fake('local');
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency());
    $document = submissionResume($case === 'foreign' ? User::factory()->applicant()->create() : $user);
    match ($case) {
        'foreign' => null,
        'archived' => $document->delete(),
        'non-resume' => $document->update(['document_type' => 'passport']),
        'missing file' => Storage::disk('local')->delete($document->storage_path),
    };

    $this->actingAs($user)->post("/job/{$post->id}/apply", ['resume_document_id' => $document->id])
        ->assertSessionHasErrors('resume_document_id');

    $this->assertDatabaseCount('applications', 0);
})->with(['foreign', 'archived', 'non-resume', 'missing file']);

test('a new resume is stored privately with the application', function (string $extension, string $mime) {
    Storage::fake('local');
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency());

    $this->actingAs($user)->post("/job/{$post->id}/apply", ['resume' => UploadedFile::fake()->create('new-resume.'.$extension, 20, $mime)])
        ->assertRedirect(route('jobs.apply', $post->id))->assertSessionHasNoErrors();

    $document = Application::sole()->resumeDocument;
    expect($document->applicant_user_id)->toBe($user->id);
    expect($document->original_file_name)->toBe('new-resume.'.$extension);
    expect($document->document_type->value)->toBe('resume');
    Storage::disk('local')->assertExists($document->storage_path);
})->with([['pdf', 'application/pdf'], ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']]);

test('readable application uploads are stored even when the temporary path cannot be canonicalized', function (string $type) {
    Storage::fake('local');
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency(), ['required_documents' => $type === 'supporting document' ? ['NBI clearance'] : []]);
    $content = "%PDF-1.4\nApplication attachment\n%%EOF";
    $source = UploadedFile::fake()->createWithContent('attachment.pdf', $content);
    $upload = new class($source->getPathname(), 'attachment.pdf', 'application/pdf', UPLOAD_ERR_OK, true) extends UploadedFile
    {
        public function getRealPath(): string|false
        {
            return false;
        }
    };
    $input = $type === 'resume'
        ? ['resume' => $upload]
        : ['resume_document_id' => submissionResume($user)->id, 'documents' => [['name' => 'NBI clearance', 'file' => $upload]]];

    $this->actingAs($user)->post("/job/{$post->id}/apply", $input)
        ->assertRedirect(route('jobs.apply', $post->id))->assertSessionHasNoErrors();

    $application = Application::sole();
    $document = $type === 'resume' ? $application->resumeDocument : $application->supportingDocuments->sole();
    expect($document->applicant_user_id)->toBe($user->id);
    expect($document->original_file_name)->toBe('attachment.pdf');
    expect(Storage::disk('local')->get($document->storage_path))->toBe($content);
})->with(['resume', 'supporting document']);

test('invalid and oversized resume uploads never create applications', function (string $case) {
    Storage::fake('local');
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency());
    $file = match ($case) {
        'wrong type' => UploadedFile::fake()->create('resume.html', 10, 'text/html'),
        'disguised file' => UploadedFile::fake()->createWithContent('resume.pdf', '<script>not a PDF</script>'),
        'oversized' => UploadedFile::fake()->create('resume.pdf', 10241, 'application/pdf'),
    };

    $upload = $case === 'disguised file'
        ? new UploadedFile($file->getPathname(), 'resume.pdf', null, null, true)
        : $file;
    $this->actingAs($user)->post("/job/{$post->id}/apply", ['resume' => $upload])->assertSessionHasErrors('resume');

    $this->assertDatabaseCount('applications', 0);
    expect(Storage::disk('local')->allFiles())->toBeEmpty();
})->with(['wrong type', 'disguised file', 'oversized']);

test('repeated submissions never overwrite an existing application', function () {
    Storage::fake('local');
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency());
    $input = ['resume_document_id' => submissionResume($user)->id, 'cover_letter' => 'Original'];
    $this->actingAs($user)->post("/job/{$post->id}/apply", $input)->assertSessionHasNoErrors();

    $this->post("/job/{$post->id}/apply", [...$input, 'cover_letter' => 'Replacement'])->assertSessionHasErrors('application');

    $this->assertDatabaseCount('applications', 1);
    expect(Application::sole()->cover_letter)->toBe('Original');
});

test('closed expired archived and hidden-agency jobs cannot receive applications', function (string $case) {
    Storage::fake('local');
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency());
    match ($case) {
        'closed' => $post->update(['status' => 'closed']),
        'expired' => $post->update(['closing_date' => now()->subDay()]),
        'archived' => $post->update(['status' => 'archived']),
        'hidden agency' => $post->agency->update(['suspended_at' => now()]),
    };

    $this->actingAs($user)->post("/job/{$post->id}/apply", ['resume_document_id' => submissionResume($user)->id])->assertNotFound();

    $this->assertDatabaseCount('applications', 0);
})->with(['closed', 'expired', 'archived', 'hidden agency']);

test('application failures roll back records and remove the new private upload', function () {
    Storage::fake('local');
    Exceptions::fake();
    $user = User::factory()->applicant()->create();
    $post = PublicCatalog::post(PublicCatalog::agency());
    $question = $post->questions()->create(['question_text' => 'Experience?', 'answer_type' => 'short', 'is_required' => true, 'sort_order' => 0]);
    $this->partialMock(ApplicantRepository::class)->shouldReceive('createAnswers')->once()->andThrow(new RuntimeException('private database details'));

    $this->actingAs($user)->post("/job/{$post->id}/apply", [
        'resume' => UploadedFile::fake()->create('resume.pdf', 20, 'application/pdf'), 'answers' => [$question->id => 'Three years'],
    ])->assertSessionHasErrors('application');

    $this->assertDatabaseCount('applications', 0);
    $this->assertDatabaseCount('applicant_documents', 0);
    $this->assertDatabaseCount('application_stage_history', 0);
    expect(Storage::disk('local')->allFiles())->toBeEmpty();
    Exceptions::assertReported(RuntimeException::class);
});

test('submission requires a verified applicant account', function () {
    $post = PublicCatalog::post(PublicCatalog::agency());
    $this->post("/job/{$post->id}/apply")->assertRedirect(route('login'));
    $this->actingAs(User::factory()->applicant()->unverified()->create())->post("/job/{$post->id}/apply")->assertRedirect(route('verification.notice'));
    $this->actingAs(User::factory()->create())->post("/job/{$post->id}/apply")->assertForbidden();
    $this->assertDatabaseCount('applications', 0);
});
