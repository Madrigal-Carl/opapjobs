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
        Schema::create('job_subcategories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_category_id')->constrained()->restrictOnDelete();
            $table->string('subcategory_name');
            $table->unsignedInteger('sort_order');
            $table->softDeletes();
            $table->timestamps();
        });

        DB::statement('CREATE UNIQUE INDEX job_subcategories_category_name_unique ON job_subcategories (job_category_id, subcategory_name) WHERE deleted_at IS NULL');

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE job_subcategories ADD CONSTRAINT job_subcategories_sort_order_check CHECK (sort_order BETWEEN 0 AND 65535)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_subcategories');
    }
};
