<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApplicantEducation extends Model
{
    protected $table = 'applicant_education';

    protected $fillable = [
        'applicant_user_id', 'school_name', 'degree', 'field_of_study',
        'started_on', 'ended_on', 'sort_order',
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
