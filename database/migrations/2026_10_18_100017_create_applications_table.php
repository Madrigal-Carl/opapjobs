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
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_post_id')->constrained()->restrictOnDelete();
            $table->foreignId('applicant_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('resume_document_id')->nullable()->constrained('applicant_documents')->restrictOnDelete();
            $table->text('cover_letter')->nullable();
            $table->decimal('expected_monthly_salary', 12, 2)->nullable();
            $table->string('availability')->nullable();
            $table->string('stage')->default('pending');
            $table->timestamp('submitted_at')->index();
            $table->timestamp('applicant_archived_at')->nullable();
            $table->timestamps();
            $table->unique(['job_post_id', 'applicant_user_id']);
            $table->index(['job_post_id', 'stage']);
            $table->index(['applicant_user_id', 'stage']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE applications ADD CONSTRAINT applications_availability_check CHECK (availability IN ('immediately', 'within_2_weeks', 'within_1_month', 'more_than_1_month'))");
            DB::statement("ALTER TABLE applications ADD CONSTRAINT applications_stage_check CHECK (stage IN ('pending', 'under_review', 'shortlisted', 'interviewed', 'hired'))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
