<?php

namespace App\Models;

use App\Enums\ApplicationStage;
use App\Enums\Availability;
use Database\Factories\ApplicationFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property ApplicationStage $stage
 * @property Availability|null $availability
 * @property Carbon $submitted_at
 */
class Application extends Model
{
    /** @use HasFactory<ApplicationFactory> */
    use HasFactory;

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

    /** @param Builder<static> $query */
    #[Scope]
    protected function visibleTo(Builder $query, User $user): void
    {
        $query->whereIn('applications.job_post_id', JobPost::query()->visibleTo($user)->select('job_posts.id'));
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

    /** @return BelongsToMany<ApplicantDocument, $this> */
    public function supportingDocuments(): BelongsToMany
    {
        return $this->belongsToMany(ApplicantDocument::class, 'application_documents')->withPivot('requirement_name');
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
