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
        Schema::create('job_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agency_id')->constrained()->restrictOnDelete();
            $table->foreignId('posted_by_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('employer_id')->nullable()->index()->constrained()->restrictOnDelete();
            $table->string('recruitment_type');
            // Only meaningful for a "with job order" posting; the form hides
            // the field for manpooling, so the column stays empty there.
            $table->string('job_order_number')->nullable()->index();
            // A plain list of document names ("COC", "PSNC"), stored as JSON
            // because each entry is a single string with no structure of its
            // own. See the languages/questions tables for the shaped case.
            $table->jsonb('required_documents')->nullable();
            $table->string('job_title');
            $table->foreignId('job_subcategory_id')->index()->constrained()->restrictOnDelete();
            $table->string('work_location');
            $table->unsignedInteger('vacant_positions');
            $table->string('contract_type');
            $table->string('salary_currency')->nullable();
            $table->decimal('monthly_salary_min', 12, 2)->nullable();
            $table->decimal('monthly_salary_max', 12, 2)->nullable();
            $table->string('education_level');
            $table->unsignedTinyInteger('min_experience_years')->nullable();
            $table->unsignedTinyInteger('max_experience_years')->nullable();
            $table->string('gender_requirement')->default('any');
            $table->text('job_description');
            $table->text('other_requirements')->nullable();
            $table->text('application_instructions')->nullable();
            $table->string('contact_person_name')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('status')->default('pending');
            $table->date('closing_date')->nullable()->index();
            $table->boolean('is_urgent')->default(false);
            $table->timestamps();
            $table->index(['agency_id', 'posted_by_user_id']);
            $table->index(['agency_id', 'status', 'closing_date']);
            $table->index('created_at');
        });

        if (DB::getDriverName() === 'pgsql') {
            $checks = [
                'recruitment_type' => "recruitment_type IN ('joborder', 'manpooling')",
                'contract_type' => "contract_type IN ('permanent', 'fixed', 'seasonal')",
                'salary_currency' => "salary_currency IN ('SAR', 'AED', 'QAR', 'KWD', 'SGD', 'USD', 'PHP')",
                'education_level' => "education_level IN ('secondary', 'vocational', 'bachelor', 'master')",
                'gender_requirement' => "gender_requirement IN ('any', 'male', 'female')",
                'status' => "status IN ('pending', 'closed', 'archived')",
                'vacant_positions' => 'vacant_positions BETWEEN 1 AND 65535',
                'min_experience_years' => 'min_experience_years BETWEEN 0 AND 255',
                'max_experience_years' => 'max_experience_years BETWEEN 0 AND 255',
                'salary_range' => 'monthly_salary_max IS NULL OR monthly_salary_min IS NULL OR monthly_salary_max >= monthly_salary_min',
                'experience_range' => 'max_experience_years IS NULL OR min_experience_years IS NULL OR max_experience_years >= min_experience_years',
            ];

            foreach ($checks as $name => $expression) {
                DB::statement("ALTER TABLE job_posts ADD CONSTRAINT job_posts_{$name}_check CHECK ({$expression})");
            }

            // Trigram indexes keep the case-insensitive title and location searches fast.
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
        Schema::dropIfExists('job_posts');
    }
};
