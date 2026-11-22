<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * First normal form: a job post's required documents and a selection
 * question's choices were JSON lists inside one column. Each item becomes a
 * row of its own, in the order it was listed. Existing lists are copied over
 * before the JSON columns are dropped, and `down()` copies them back.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('job_post_required_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_post_id')->constrained()->cascadeOnDelete();
            $table->string('document_name');
            $table->unsignedInteger('sort_order');
            $table->unique(['job_post_id', 'document_name']);
        });

        Schema::create('job_post_question_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_post_question_id')->constrained()->cascadeOnDelete();
            $table->string('option_text');
            $table->unsignedInteger('sort_order');
            $table->unique(['job_post_question_id', 'option_text']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE job_post_required_documents ADD CONSTRAINT job_post_required_documents_sort_order_check CHECK (sort_order BETWEEN 0 AND 65535)');
            DB::statement('ALTER TABLE job_post_question_options ADD CONSTRAINT job_post_question_options_sort_order_check CHECK (sort_order BETWEEN 0 AND 65535)');
        }

        $this->splitList('job_posts', 'required_documents', 'job_post_required_documents', 'job_post_id', 'document_name');
        $this->splitList('job_post_questions', 'options', 'job_post_question_options', 'job_post_question_id', 'option_text');

        Schema::table('job_posts', fn (Blueprint $table) => $table->dropColumn('required_documents'));
        Schema::table('job_post_questions', fn (Blueprint $table) => $table->dropColumn('options'));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_posts', fn (Blueprint $table) => $table->jsonb('required_documents')->nullable());
        Schema::table('job_post_questions', fn (Blueprint $table) => $table->json('options')->nullable());

        $this->joinList('job_post_required_documents', 'job_post_id', 'document_name', 'job_posts', 'required_documents');
        $this->joinList('job_post_question_options', 'job_post_question_id', 'option_text', 'job_post_questions', 'options');

        Schema::dropIfExists('job_post_question_options');
        Schema::dropIfExists('job_post_required_documents');
    }

    /** Copies each JSON list into one row per item, dropping blanks and repeats. */
    private function splitList(string $table, string $column, string $childTable, string $foreignKey, string $valueColumn): void
    {
        DB::table($table)->whereNotNull($column)->select(['id', $column])->orderBy('id')
            ->each(function (object $row) use ($column, $childTable, $foreignKey, $valueColumn): void {
                $items = json_decode((string) $row->{$column}, true);
                $values = array_values(array_unique(array_filter(
                    array_map(fn (mixed $item): string => is_string($item) ? trim($item) : '', is_array($items) ? $items : []),
                    fn (string $item): bool => $item !== '',
                )));

                if ($values !== []) {
                    DB::table($childTable)->insert(array_map(
                        fn (string $value, int $index): array => [$foreignKey => $row->id, $valueColumn => $value, 'sort_order' => $index],
                        $values, array_keys($values),
                    ));
                }
            });
    }

    /** Folds the rows back into one JSON list per parent, in their listed order. */
    private function joinList(string $childTable, string $foreignKey, string $valueColumn, string $table, string $column): void
    {
        DB::table($childTable)->orderBy($foreignKey)->orderBy('sort_order')->get()
            ->groupBy($foreignKey)
            ->each(fn ($rows, $parentId) => DB::table($table)->where('id', $parentId)
                ->update([$column => json_encode($rows->pluck($valueColumn)->all(), JSON_THROW_ON_ERROR)]));
    }
};
