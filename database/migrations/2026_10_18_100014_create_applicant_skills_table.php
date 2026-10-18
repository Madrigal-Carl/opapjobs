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
        Schema::create('applicant_skills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('applicant_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('skill_name');
            $table->string('skill_level');
            $table->unsignedInteger('sort_order');
            $table->timestamps();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE UNIQUE INDEX applicant_skills_applicant_name_unique ON applicant_skills (applicant_user_id, lower(skill_name))');
            DB::statement("ALTER TABLE applicant_skills ADD CONSTRAINT applicant_skills_skill_level_check CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert'))");
            DB::statement('ALTER TABLE applicant_skills ADD CONSTRAINT applicant_skills_sort_order_check CHECK (sort_order BETWEEN 0 AND 65535)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('applicant_skills');
    }
};
