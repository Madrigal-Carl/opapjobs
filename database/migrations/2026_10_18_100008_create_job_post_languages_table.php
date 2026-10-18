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
        Schema::create('job_post_languages', function (Blueprint $table) {
            $table->foreignId('job_post_id')->constrained()->cascadeOnDelete();
            $table->string('language');
            $table->string('proficiency');
            $table->primary(['job_post_id', 'language']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE job_post_languages ADD CONSTRAINT job_post_languages_language_check CHECK (language IN ('english', 'arabic', 'tagalog', 'mandarin', 'hindi', 'urdu', 'spanish', 'portuguese', 'russian', 'japanese'))");
            DB::statement("ALTER TABLE job_post_languages ADD CONSTRAINT job_post_languages_proficiency_check CHECK (proficiency IN ('basic', 'conversational', 'fluent'))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_post_languages');
    }
};
