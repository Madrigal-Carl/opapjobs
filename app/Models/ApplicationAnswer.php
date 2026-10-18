<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApplicationAnswer extends Model
{
    public $timestamps = false;

    protected $fillable = ['application_id', 'job_post_question_id', 'answer_text'];

    /** @return BelongsTo<Application, $this> */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /** @return BelongsTo<JobPostQuestion, $this> */
    public function question(): BelongsTo
    {
        return $this->belongsTo(JobPostQuestion::class, 'job_post_question_id')->withTrashed();
    }
}
