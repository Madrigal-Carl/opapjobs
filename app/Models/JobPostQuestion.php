<?php

namespace App\Models;

use App\Enums\QuestionAnswerType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property QuestionAnswerType $answer_type
 * @property bool $is_required
 * @property list<string>|null $options
 */
class JobPostQuestion extends Model
{
    use SoftDeletes;

    protected $fillable = ['job_post_id', 'question_text', 'answer_type', 'expected_answer', 'options', 'is_required', 'sort_order'];

    protected function casts(): array
    {
        return ['answer_type' => QuestionAnswerType::class, 'options' => 'array', 'is_required' => 'boolean', 'sort_order' => 'integer'];
    }

    /** @return BelongsTo<JobPost, $this> */
    public function jobPost(): BelongsTo
    {
        return $this->belongsTo(JobPost::class);
    }

    /** @return HasMany<ApplicationAnswer, $this> */
    public function answers(): HasMany
    {
        return $this->hasMany(ApplicationAnswer::class);
    }
}
