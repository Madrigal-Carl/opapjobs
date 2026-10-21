<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('job_posts', function (Blueprint $table) {
            // Only meaningful for a "with job order" posting; the form hides
            // the field for manpooling, so the column stays empty there.
            $table->string('job_order_number')->nullable()->index();
            // A plain list of document names ("COC", "PSNC"), stored as JSON
            // because each entry is a single string with no structure of its
            // own. See the languages/questions tables for the shaped case.
            $table->jsonb('required_documents')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_posts', function (Blueprint $table) {
            $table->dropIndex(['job_order_number']);
            $table->dropColumn(['job_order_number', 'required_documents']);
        });
    }
};
