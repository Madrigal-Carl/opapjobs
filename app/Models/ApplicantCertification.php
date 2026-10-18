<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApplicantCertification extends Model
{
    protected $fillable = [
        'applicant_user_id', 'certification_name', 'issuing_organization',
        'issued_on', 'expires_on', 'credential_url', 'sort_order',
    ];

    protected function casts(): array
    {
        return ['issued_on' => 'date', 'expires_on' => 'date', 'sort_order' => 'integer'];
    }

    /** @return BelongsTo<User, $this> */
    public function applicant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applicant_user_id')->withTrashed();
    }
}
