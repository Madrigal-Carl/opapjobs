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
        Schema::create('application_documents', function (Blueprint $table) {
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->foreignId('applicant_document_id')->constrained()->restrictOnDelete();
            $table->string('requirement_name');
            $table->primary(['application_id', 'applicant_document_id']);
            $table->unique(['application_id', 'requirement_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('application_documents');
    }
};
