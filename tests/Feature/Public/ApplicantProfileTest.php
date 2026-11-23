<?php

use App\Models\ApplicantDocument;
use App\Models\User;
use App\Services\Site\ApplicantService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->applicant = User::factory()->applicant()->create(['name' => 'Mariel Santos']);
});

/** @return array<string, mixed> */
function profilePayload(array $overrides = []): array
{
    return [
        'name' => 'Mariel A. Santos', 'headline' => 'Electrical Technician', 'phone' => '+63 900 000 2001',
        'location' => 'Cebu City', 'summary' => 'Eight years on switchgear.', 'is_visible' => false,
        'experiences' => [
            ['role' => 'Electrician', 'company' => 'Meralco', 'start' => 'Mar 2019', 'end' => null, 'location' => null, 'description' => null],
            ['role' => 'Apprentice', 'company' => 'Visayan Electric', 'start' => 'Jun 2016', 'end' => 'Feb 2019', 'location' => 'Cebu', 'description' => 'Wiring.'],
        ],
        'education' => [['school' => 'Cebu Technological University', 'degree' => 'BS Electrical Engineering', 'field' => null, 'start' => '2012', 'end' => '2016']],
        'certifications' => [['name' => 'NC II Electrical', 'issuer' => 'TESDA', 'issued_on' => '2020-05-12', 'expires_on' => '2025-05-12', 'credential_url' => 'https://tesda.gov.ph/c/1']],
        'skills' => [['name' => 'LV switchgear', 'level' => 'expert'], ['name' => 'PLC', 'level' => 'beginner']],
        ...$overrides,
    ];
}

test('applicants save the whole profile and read it back on the profile page', function () {
    $this->actingAs($this->applicant)->put(route('profile.save'), profilePayload())
        ->assertRedirect()->assertSessionHasNoErrors();

    $this->get(route('profile'))->assertInertia(fn (Assert $page) => $page
        ->where('profile.name', 'Mariel A. Santos')
        ->where('profile.headline', 'Electrical Technician')
        ->where('profile.visibleToEmployers', false)
        ->where('profile.experiences', fn ($rows) => collect($rows)->map(fn ($row) => [$row['role'], $row['start'], $row['end']])->all() === [
            ['Electrician', 'Mar 2019', ''], ['Apprentice', 'Jun 2016', 'Feb 2019'],
        ])
        ->where('profile.education.0.start', '2012')->where('profile.education.0.end', '2016')
        ->where('profile.certifications.0.expiryDate', '2025-05-12')
        ->where('profile.skills', fn ($rows) => collect($rows)->map(fn ($row) => [$row['name'], $row['level']])->all() === [
            ['LV switchgear', 'Expert'], ['PLC', 'Beginner'],
        ]));
});

test('saving a section list replaces what was stored', function () {
    $this->actingAs($this->applicant)->put(route('profile.save'), profilePayload());
    $this->put(route('profile.save'), profilePayload(['experiences' => [], 'skills' => [['name' => 'Welding', 'level' => 'advanced']]]))
        ->assertSessionHasNoErrors();

    expect($this->applicant->experiences()->count())->toBe(0);
    expect($this->applicant->skills()->pluck('skill_name')->all())->toBe(['Welding']);
    expect($this->applicant->education()->count())->toBe(1);
});

test('profile saves are validated before anything is stored', function (array $overrides, string $field) {
    $this->actingAs($this->applicant)->put(route('profile.save'), profilePayload($overrides))
        ->assertSessionHasErrors($field);

    expect($this->applicant->fresh()->name)->toBe('Mariel Santos');
    expect($this->applicant->experiences()->count())->toBe(0);
})->with([
    'blank name' => [['name' => ''], 'name'],
    'role without a company' => [['experiences' => [['role' => 'Electrician', 'company' => '', 'start' => 'Mar 2019']]], 'experiences.0.company'],
    'unreadable start month' => [['experiences' => [['role' => 'Electrician', 'company' => 'Meralco', 'start' => '2019-03']]], 'experiences.0.start'],
    'role ending before it started' => [['experiences' => [['role' => 'Electrician', 'company' => 'Meralco', 'start' => 'Mar 2019', 'end' => 'Jan 2018']]], 'experiences.0.end'],
    'school year that is not a year' => [['education' => [['school' => 'CTU', 'degree' => 'BS', 'start' => '20']]], 'education.0.start'],
    'certificate expiring before it was issued' => [['certifications' => [['name' => 'NC II', 'issuer' => 'TESDA', 'issued_on' => '2020-05-12', 'expires_on' => '2019-01-01']]], 'certifications.0.expires_on'],
    'credential link that is not a web link' => [['certifications' => [['name' => 'NC II', 'issuer' => 'TESDA', 'credential_url' => 'javascript:alert(1)']]], 'certifications.0.credential_url'],
    'the same skill twice' => [['skills' => [['name' => 'PLC', 'level' => 'expert'], ['name' => 'plc', 'level' => 'beginner']]], 'skills.1.name'],
    'unknown skill level' => [['skills' => [['name' => 'PLC', 'level' => 'guru']]], 'skills.0.level'],
    'missing section list' => [['experiences' => null], 'experiences'],
]);

test('profile errors read on their own because the page shows only the first one', function () {
    $this->actingAs($this->applicant)->put(route('profile.save'), profilePayload([
        'experiences' => [['role' => 'Electrician', 'company' => 'Meralco', 'start' => 'Mar 2019', 'end' => 'Jan 2018']],
        'skills' => [['name' => 'PLC', 'level' => 'expert'], ['name' => 'plc', 'level' => 'beginner']],
    ]))->assertSessionHasErrors([
        'experiences.0.end' => 'A role cannot end before it started.',
        'skills.1.name' => 'Each skill can be listed only once.',
    ]);
});

test('applicants add several files to their profile at once and remove them again', function () {
    Storage::fake('local');

    $this->actingAs($this->applicant)->post(route('profile.documents.store'), ['documents' => [
        UploadedFile::fake()->create('resume.pdf', 20, 'application/pdf'),
        UploadedFile::fake()->create('nbi.docx', 20, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ]])->assertRedirect()->assertSessionHasNoErrors();

    $documents = $this->applicant->documents()->get();
    expect($documents->pluck('original_file_name')->sort()->values()->all())->toBe(['nbi.docx', 'resume.pdf']);
    $documents->each(fn (ApplicantDocument $document) => Storage::disk('local')->assertExists($document->storage_path));
    $this->get(route('profile'))->assertInertia(fn (Assert $page) => $page->has('profile.documents', 2));

    $this->delete(route('profile.documents.destroy', $documents->first()->id))->assertRedirect();

    expect($this->applicant->documents()->withTrashed()->pluck('id')->all())->toBe([$documents->last()->id]);
    // No application sent it, so nothing is left behind on the server.
    Storage::disk('local')->assertMissing($documents->first()->storage_path);
});

test('profile uploads accept only PDF and DOCX files within the limits and store nothing otherwise', function (array $files, string $field) {
    Storage::fake('local');

    $this->actingAs($this->applicant)->post(route('profile.documents.store'), ['documents' => $files])
        ->assertSessionHasErrors($field);

    expect($this->applicant->documents()->count())->toBe(0);
    expect(Storage::disk('local')->allFiles())->toBe([]);
})->with([
    'no files' => fn () => [[], 'documents'],
    'an image' => fn () => [[UploadedFile::fake()->image('photo.png')], 'documents.0'],
    'too large' => fn () => [[UploadedFile::fake()->create('big.pdf', 10241, 'application/pdf')], 'documents.0'],
]);

test('a profile holds a limited number of files and the overflow is not stored', function () {
    Storage::fake('local');
    foreach (range(1, ApplicantService::MAX_DOCUMENTS) as $index) {
        $this->applicant->documents()->create([
            'document_type' => 'other', 'original_file_name' => "file-{$index}.pdf", 'storage_path' => "documents/{$index}.pdf",
            'mime_type' => 'application/pdf', 'file_size_bytes' => 10, 'is_primary' => false, 'uploaded_at' => now(),
        ]);
    }

    $this->actingAs($this->applicant)->post(route('profile.documents.store'), ['documents' => [UploadedFile::fake()->create('one-more.pdf', 10, 'application/pdf')]])
        ->assertSessionHasErrors('documents');

    expect($this->applicant->documents()->count())->toBe(ApplicantService::MAX_DOCUMENTS);
    expect(Storage::disk('local')->allFiles())->toBe([]);
});

test('applicants cannot remove another applicant\'s file', function () {
    $other = User::factory()->applicant()->create();
    $document = $other->documents()->create([
        'document_type' => 'other', 'original_file_name' => 'theirs.pdf', 'storage_path' => 'documents/theirs.pdf',
        'mime_type' => 'application/pdf', 'file_size_bytes' => 10, 'is_primary' => false, 'uploaded_at' => now(),
    ]);

    $this->actingAs($this->applicant)->delete(route('profile.documents.destroy', $document->id))->assertNotFound();

    expect($document->fresh()->trashed())->toBeFalse();
});

test('a new profile photo replaces the old one and is served only to its owner', function () {
    Storage::fake('local');

    $this->actingAs($this->applicant)->post(route('profile.avatar.update'), ['avatar' => UploadedFile::fake()->image('first.png')])
        ->assertRedirect()->assertSessionHasNoErrors();
    $first = $this->applicant->applicantProfile()->value('avatar_path');

    $this->post(route('profile.avatar.update'), ['avatar' => UploadedFile::fake()->image('second.jpg')])->assertSessionHasNoErrors();
    $second = $this->applicant->applicantProfile()->value('avatar_path');

    expect($second)->not->toBe($first);
    Storage::disk('local')->assertMissing($first);
    Storage::disk('local')->assertExists($second);
    $this->get(route('profile.avatar'))->assertOk();
    $this->get(route('profile'))->assertInertia(fn (Assert $page) => $page
        ->where('profile.avatarUrl', fn (string $url) => str_starts_with($url, route('profile.avatar')))
        // The header's account button shows the same photo on every page.
        ->where('auth.user.avatar', fn (string $url) => str_starts_with($url, route('profile.avatar'))));

    $this->actingAs(User::factory()->applicant()->create())->get(route('profile.avatar'))->assertNotFound();
});

test('profile photos must be small images', function () {
    Storage::fake('local');

    $this->actingAs($this->applicant)->post(route('profile.avatar.update'), ['avatar' => UploadedFile::fake()->create('photo.pdf', 10, 'application/pdf')])
        ->assertSessionHasErrors('avatar');

    expect(Storage::disk('local')->allFiles())->toBe([]);
});

test('guests are sent to sign in and staff cannot edit an applicant profile', function () {
    $this->put(route('profile.save'), profilePayload())->assertRedirect(route('login'));

    $staff = User::factory()->agency()->create(['name' => 'Agency Staff']);
    $this->actingAs($staff)->put(route('profile.save'), profilePayload())->assertRedirect();

    expect($staff->fresh()->name)->toBe('Agency Staff');
});
