<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $columns = [
            'applications' => ['stage'],
            'application_stage_history' => ['from_stage', 'to_stage'],
        ];

        foreach ($columns as $table => $stageColumns) {
            foreach ($stageColumns as $column) {
                if (DB::getDriverName() === 'pgsql') {
                    DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$table}_{$column}_check");
                }

                foreach (['applied' => 'pending', 'under_review' => 'reviewed', 'interview' => 'interviewed'] as $legacy => $stage) {
                    DB::table($table)->where($column, $legacy)->update([$column => $stage]);
                }

                if (DB::getDriverName() === 'pgsql') {
                    DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$table}_{$column}_check CHECK ({$column} IN ('pending', 'reviewed', 'shortlisted', 'interviewed', 'hired'))");
                }
            }
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE applications ALTER COLUMN stage SET DEFAULT 'pending'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new LogicException('Stage normalization cannot be reversed without restoring a database backup.');
    }
};
