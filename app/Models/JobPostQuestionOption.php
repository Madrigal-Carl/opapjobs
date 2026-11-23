<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One choice an applicant can pick on a selection question. */
class JobPostQuestionOption extends Model
{
    public $timestamps = false;

    protected $fillable = ['option_text', 'sort_order'];

    protected function casts(): array
    {
        return ['sort_order' => 'integer'];
    }

    /** @return BelongsTo<JobPostQuestion, $this> */
    public function question(): BelongsTo
    {
        return $this->belongsTo(JobPostQuestion::class, 'job_post_question_id');
    }
}
