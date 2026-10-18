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
        Schema::create('application_stage_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->string('from_stage')->nullable();
            $table->string('to_stage');
            $table->foreignId('changed_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->text('note')->nullable();
            $table->timestamp('created_at');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE application_stage_history ADD CONSTRAINT application_stage_history_from_stage_check CHECK (from_stage IN ('applied', 'reviewed', 'interview', 'hired', 'pending'))");
            DB::statement("ALTER TABLE application_stage_history ADD CONSTRAINT application_stage_history_to_stage_check CHECK (to_stage IN ('applied', 'reviewed', 'interview', 'hired', 'pending'))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('application_stage_history');
    }
};
