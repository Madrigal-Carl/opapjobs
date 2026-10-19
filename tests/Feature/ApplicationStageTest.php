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

    foreach (['pending', 'under_review', 'shortlisted', 'interviewed', 'hired'] as $value) {
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
