<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('job_post_questions', function (Blueprint $table) {
            $table->json('options')->nullable();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE job_post_questions DROP CONSTRAINT job_post_questions_answer_type_check');
            DB::statement("ALTER TABLE job_post_questions ADD CONSTRAINT job_post_questions_answer_type_check CHECK (answer_type IN ('yesno', 'short', 'paragraph', 'selection', 'number'))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE job_post_questions DROP CONSTRAINT job_post_questions_answer_type_check');
            DB::statement("ALTER TABLE job_post_questions ADD CONSTRAINT job_post_questions_answer_type_check CHECK (answer_type IN ('yesno', 'short', 'paragraph'))");
        }

        Schema::table('job_post_questions', function (Blueprint $table) {
            $table->dropColumn('options');
        });
    }
};
