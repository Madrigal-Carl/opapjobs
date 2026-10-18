<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class SavedJobPost extends Pivot
{
    public const UPDATED_AT = null;

    protected $table = 'saved_job_posts';

    protected $foreignKey = 'applicant_user_id';

    protected $relatedKey = 'job_post_id';

    protected $fillable = ['applicant_user_id', 'job_post_id', 'created_at'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    /** A pivot normally inherits its parent's timestamp column names. */
    public function getUpdatedAtColumn(): ?string
    {
        return null;
    }

    /** @return BelongsTo<User, $this> */
    public function applicant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applicant_user_id')->withTrashed();
    }

    /** @return BelongsTo<JobPost, $this> */
    public function jobPost(): BelongsTo
    {
        return $this->belongsTo(JobPost::class);
    }
}
