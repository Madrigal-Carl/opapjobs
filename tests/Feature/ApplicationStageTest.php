<?php

use App\Enums\ApplicationStage;
use App\Models\Application;
use App\Models\ApplicationStageHistory;
use Illuminate\Support\Facades\DB;

test('new applications default to pending in the factory and database', function () {
    $application = Application::factory()->create();
    expect($application->fresh()->stage)->toBe(ApplicationStage::Pending);

    $attributes = Application::factory()->raw();
    unset($attributes['stage']);
    $id = DB::table('applications')->insertGetId($attributes);

    expect(Application::findOrFail($id)->stage)->toBe(ApplicationStage::Pending);
});

test('applications and their history persist each step of the new pipeline', function () {
    $application = Application::factory()->create();
    $previous = null;

    foreach (['pending', 'reviewed', 'shortlisted', 'interviewed', 'hired', 'rejected'] as $value) {
        $stage = ApplicationStage::from($value);
        $application->update(['stage' => $stage]);
        $history = ApplicationStageHistory::create([
            'application_id' => $application->id,
            'from_stage' => $previous,
            'to_stage' => $stage,
            'created_at' => now(),
        ]);

        expect($application->fresh()->stage)->toBe($stage);
        expect($history->fresh()->from_stage)->toBe($previous);
        expect($history->fresh()->to_stage)->toBe($stage);
        $previous = $stage;
    }
});

test('stage normalization preserves applications and history while converting legacy values', function (string $legacy, string $expected) {
    if (DB::getDriverName() === 'pgsql') {
        DB::statement('ALTER TABLE applications DROP CONSTRAINT applications_stage_check');
        DB::statement('ALTER TABLE application_stage_history DROP CONSTRAINT application_stage_history_from_stage_check');
        DB::statement('ALTER TABLE application_stage_history DROP CONSTRAINT application_stage_history_to_stage_check');
    }

    $application = Application::factory()->create(['cover_letter' => 'Keep this application']);
    DB::table('applications')->where('id', $application->id)->update(['stage' => $legacy]);
    $historyId = DB::table('application_stage_history')->insertGetId([
        'application_id' => $application->id, 'from_stage' => $legacy,
        'to_stage' => $legacy, 'note' => 'Keep this history', 'created_at' => now(),
    ]);
    $migration = require database_path('migrations/2026_10_23_131715_normalize_application_stage_values.php');

    $migration->up();
    $migration->up();

    $this->assertDatabaseCount('applications', 1);
    $this->assertDatabaseCount('application_stage_history', 1);
    $this->assertDatabaseHas('applications', [
        'id' => $application->id, 'stage' => $expected, 'cover_letter' => 'Keep this application',
    ]);
    $this->assertDatabaseHas('application_stage_history', [
        'id' => $historyId, 'from_stage' => $expected, 'to_stage' => $expected, 'note' => 'Keep this history',
    ]);
})->with([
    'applied' => ['applied', 'pending'],
    'under review' => ['under_review', 'reviewed'],
    'interview' => ['interview', 'interviewed'],
    'pending' => ['pending', 'pending'],
    'reviewed' => ['reviewed', 'reviewed'],
    'shortlisted' => ['shortlisted', 'shortlisted'],
    'interviewed' => ['interviewed', 'interviewed'],
    'hired' => ['hired', 'hired'],
]);

test('each stage reports the next step and whether it is terminal', function () {
    expect(ApplicationStage::Pending->next())->toBe(ApplicationStage::Reviewed)
        ->and(ApplicationStage::Reviewed->next())->toBe(ApplicationStage::Shortlisted)
        ->and(ApplicationStage::Shortlisted->next())->toBe(ApplicationStage::Interviewed)
        ->and(ApplicationStage::Interviewed->next())->toBe(ApplicationStage::Hired)
        ->and(ApplicationStage::Hired->next())->toBeNull()
        ->and(ApplicationStage::Rejected->next())->toBeNull();

    expect(ApplicationStage::Hired->isTerminal())->toBeTrue()
        ->and(ApplicationStage::Rejected->isTerminal())->toBeTrue()
        ->and(ApplicationStage::Pending->isTerminal())->toBeFalse()
        ->and(ApplicationStage::Interviewed->isTerminal())->toBeFalse();
});

test('factory stage states set each pipeline stage', function (string $state, ApplicationStage $stage) {
    expect(Application::factory()->{$state}()->create()->fresh()->stage)->toBe($stage);
})->with([
    'pending' => ['pending', ApplicationStage::Pending],
    'reviewed' => ['reviewed', ApplicationStage::Reviewed],
    'shortlisted' => ['shortlisted', ApplicationStage::Shortlisted],
    'interviewed' => ['interviewed', ApplicationStage::Interviewed],
    'hired' => ['hired', ApplicationStage::Hired],
    'rejected' => ['rejected', ApplicationStage::Rejected],
]);
