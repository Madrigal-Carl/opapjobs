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
        Schema::create('agencies', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('agency_name');
            $table->string('pathway');
            $table->string('dmw_license_number')->unique();
            $table->string('agency_size')->nullable();
            $table->string('headquarters_city');
            $table->text('about')->nullable();
            $table->string('logo_path')->nullable();
            $table->smallInteger('year_established')->nullable();
            $table->string('public_phone')->nullable();
            $table->string('public_email')->nullable();
            $table->string('public_address')->nullable();
            $table->string('facebook_url')->nullable();
            $table->string('instagram_url')->nullable();
            $table->string('x_url')->nullable();
            $table->string('website_url')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->unsignedInteger('agency_user_limit');
            $table->foreignId('admin_user_id')->nullable()->unique();
            $table->timestamp('suspended_at')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->softDeletes();
            $table->timestamps();
        });

        DB::statement('CREATE UNIQUE INDEX agencies_agency_name_unique ON agencies (agency_name) WHERE deleted_at IS NULL');

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE agencies ADD CONSTRAINT agencies_pathway_check CHECK (pathway IN ('landbased', 'seabased'))");
            DB::statement('ALTER TABLE agencies ADD CONSTRAINT agencies_agency_user_limit_check CHECK (agency_user_limit BETWEEN 0 AND 65535)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agencies');
    }
};
