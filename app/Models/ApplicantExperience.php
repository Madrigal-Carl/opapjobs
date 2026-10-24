<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property Carbon|null $started_on
 * @property Carbon|null $ended_on
 */
class ApplicantExperience extends Model
{
    protected $fillable = [
        'applicant_user_id', 'job_role', 'company_name', 'started_on', 'ended_on',
        'work_location', 'responsibilities', 'sort_order',
    ];

    protected function casts(): array
    {
        return ['started_on' => 'date', 'ended_on' => 'date', 'sort_order' => 'integer'];
    }

    /** @return BelongsTo<User, $this> */
    public function applicant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applicant_user_id')->withTrashed();
    }
}
