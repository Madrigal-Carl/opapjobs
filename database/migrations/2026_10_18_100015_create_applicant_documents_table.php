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
        Schema::create('applicant_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('applicant_user_id')->constrained('users')->restrictOnDelete();
            $table->string('document_type')->default('resume');
            $table->string('original_file_name');
            $table->string('storage_path');
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size_bytes');
            $table->boolean('is_primary')->default(false);
            $table->timestamp('uploaded_at');
            $table->softDeletes();
            $table->timestamps();
        });

        DB::statement("CREATE UNIQUE INDEX applicant_documents_primary_resume_unique ON applicant_documents (applicant_user_id) WHERE is_primary AND document_type = 'resume' AND deleted_at IS NULL");

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE applicant_documents ADD CONSTRAINT applicant_documents_document_type_check CHECK (document_type IN ('resume', 'certificate', 'passport', 'other'))");
            DB::statement('ALTER TABLE applicant_documents ADD CONSTRAINT applicant_documents_file_size_bytes_check CHECK (file_size_bytes >= 0)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('applicant_documents');
    }
};
