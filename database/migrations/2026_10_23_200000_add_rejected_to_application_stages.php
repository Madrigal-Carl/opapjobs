<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const TABLES = [
        'applications' => ['stage'],
        'application_stage_history' => ['from_stage', 'to_stage'],
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->replaceConstraints("'pending', 'reviewed', 'shortlisted', 'interviewed', 'hired', 'rejected'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        // Rejected did not exist before this migration; fall back to the last neutral stage.
        DB::table('applications')->where('stage', 'rejected')->update(['stage' => 'reviewed']);
        DB::table('application_stage_history')->where('from_stage', 'rejected')->update(['from_stage' => null]);
        DB::table('application_stage_history')->where('to_stage', 'rejected')->update(['to_stage' => 'reviewed']);

        $this->replaceConstraints("'pending', 'reviewed', 'shortlisted', 'interviewed', 'hired'");
    }

    private function replaceConstraints(string $allowed): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (self::TABLES as $table => $columns) {
            foreach ($columns as $column) {
                DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$table}_{$column}_check");
                DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$table}_{$column}_check CHECK ({$column} IN ({$allowed}))");
            }
        }
    }
};
