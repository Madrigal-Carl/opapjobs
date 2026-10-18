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
        Schema::create('applicant_certifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('applicant_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('certification_name');
            $table->string('issuing_organization');
            $table->date('issued_on')->nullable();
            $table->date('expires_on')->nullable();
            $table->string('credential_url')->nullable();
            $table->unsignedInteger('sort_order');
            $table->timestamps();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE applicant_certifications ADD CONSTRAINT applicant_certifications_sort_order_check CHECK (sort_order BETWEEN 0 AND 65535)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('applicant_certifications');
    }
};
