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
        Schema::create('applicant_education', function (Blueprint $table) {
            $table->id();
            $table->foreignId('applicant_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('school_name');
            $table->string('degree');
            $table->string('field_of_study');
            $table->date('started_on');
            $table->date('ended_on')->nullable();
            $table->unsignedInteger('sort_order');
            $table->timestamps();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE applicant_education ADD CONSTRAINT applicant_education_sort_order_check CHECK (sort_order BETWEEN 0 AND 65535)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('applicant_education');
    }
};
