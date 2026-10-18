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
        Schema::create('applicant_profiles', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->string('headline')->nullable();
            $table->string('phone_number')->nullable();
            $table->string('current_location')->nullable();
            $table->string('avatar_path')->nullable();
            $table->text('professional_summary')->nullable();
            $table->text('default_cover_letter')->nullable();
            $table->boolean('is_visible_to_agencies')->default(true);
            $table->string('availability')->nullable();
            $table->string('preferred_pathway')->nullable();
            $table->timestamps();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE applicant_profiles ADD CONSTRAINT applicant_profiles_availability_check CHECK (availability IN ('immediately', 'within_2_weeks', 'within_1_month', 'more_than_1_month'))");
            DB::statement("ALTER TABLE applicant_profiles ADD CONSTRAINT applicant_profiles_preferred_pathway_check CHECK (preferred_pathway IN ('landbased', 'seabased'))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('applicant_profiles');
    }
};
