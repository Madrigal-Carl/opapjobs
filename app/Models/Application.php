<?php

namespace App\Models;

use App\Enums\ApplicationStage;
use App\Enums\Availability;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Application extends Model
{
    protected $fillable = [
        'job_post_id', 'applicant_user_id', 'resume_document_id', 'cover_letter',
        'expected_monthly_salary', 'availability', 'stage', 'submitted_at', 'applicant_archived_at',
    ];

    protected function casts(): array
    {
        return [
            'expected_monthly_salary' => 'decimal:2',
            'availability' => Availability::class,
            'stage' => ApplicationStage::class,
            'submitted_at' => 'datetime',
            'applicant_archived_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<JobPost, $this> */
    public function jobPost(): BelongsTo
    {
        return $this->belongsTo(JobPost::class);
    }

    /** @return BelongsTo<User, $this> */
    public function applicant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applicant_user_id')->withTrashed();
    }

    /** @return BelongsTo<ApplicantDocument, $this> */
    public function resumeDocument(): BelongsTo
    {
        return $this->belongsTo(ApplicantDocument::class, 'resume_document_id')->withTrashed();
    }

    /** @return HasMany<ApplicationAnswer, $this> */
    public function answers(): HasMany
    {
        return $this->hasMany(ApplicationAnswer::class);
    }

    /** @return HasMany<ApplicationStageHistory, $this> */
    public function stageHistory(): HasMany
    {
        return $this->hasMany(ApplicationStageHistory::class);
    }
}
