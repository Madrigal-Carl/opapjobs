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

    foreach (['pending', 'reviewed', 'shortlisted', 'for_interview', 'endorsed', 'not_selected'] as $value) {
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

test('each stage reports the next step and whether it is terminal', function () {
    expect(ApplicationStage::Pending->next())->toBe(ApplicationStage::Shortlisted)
        ->and(ApplicationStage::Reviewed->next())->toBe(ApplicationStage::Shortlisted)
        ->and(ApplicationStage::Shortlisted->next())->toBe(ApplicationStage::ForInterview)
        ->and(ApplicationStage::ForInterview->next())->toBe(ApplicationStage::Endorsed)
        ->and(ApplicationStage::Endorsed->next())->toBeNull()
        ->and(ApplicationStage::NotSelected->next())->toBeNull();

    expect(ApplicationStage::Endorsed->isTerminal())->toBeTrue()
        ->and(ApplicationStage::NotSelected->isTerminal())->toBeTrue()
        ->and(ApplicationStage::Pending->isTerminal())->toBeFalse()
        ->and(ApplicationStage::ForInterview->isTerminal())->toBeFalse();
});

test('stages are stored and labelled with the recruitment wording', function (ApplicationStage $stage, string $value, string $label) {
    expect($stage->value)->toBe($value)
        ->and($stage->label())->toBe($label);
})->with([
    'shortlisted' => [ApplicationStage::Shortlisted, 'shortlisted', 'Shortlisted'],
    'for interview' => [ApplicationStage::ForInterview, 'for_interview', 'For Interview'],
    'endorsed' => [ApplicationStage::Endorsed, 'endorsed', 'Endorsed'],
    'not selected' => [ApplicationStage::NotSelected, 'not_selected', 'Not Selected'],
]);

test('factory stage states set each pipeline stage', function (string $state, ApplicationStage $stage) {
    expect(Application::factory()->{$state}()->create()->fresh()->stage)->toBe($stage);
})->with([
    'pending' => ['pending', ApplicationStage::Pending],
    'reviewed' => ['reviewed', ApplicationStage::Reviewed],
    'shortlisted' => ['shortlisted', ApplicationStage::Shortlisted],
    'for interview' => ['forInterview', ApplicationStage::ForInterview],
    'endorsed' => ['endorsed', ApplicationStage::Endorsed],
    'not selected' => ['notSelected', ApplicationStage::NotSelected],
]);
