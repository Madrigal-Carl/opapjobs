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
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
            DB::statement('CREATE INDEX job_posts_job_title_trgm_index ON job_posts USING GIN (job_title gin_trgm_ops)');
            DB::statement('CREATE INDEX job_posts_work_location_trgm_index ON job_posts USING GIN (work_location gin_trgm_ops)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS job_posts_job_title_trgm_index');
            DB::statement('DROP INDEX IF EXISTS job_posts_work_location_trgm_index');
        }
    }
};
