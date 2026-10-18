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
        Schema::create('job_post_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_post_id')->constrained()->cascadeOnDelete();
            $table->string('question_text');
            $table->string('answer_type');
            $table->text('expected_answer')->nullable();
            $table->boolean('is_required')->default(false);
            $table->unsignedInteger('sort_order');
            $table->softDeletes();
            $table->timestamps();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE job_post_questions ADD CONSTRAINT job_post_questions_answer_type_check CHECK (answer_type IN ('yesno', 'short', 'paragraph'))");
            DB::statement('ALTER TABLE job_post_questions ADD CONSTRAINT job_post_questions_sort_order_check CHECK (sort_order BETWEEN 0 AND 65535)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_post_questions');
    }
};
