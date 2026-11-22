<?php

namespace App\Models;

use App\Enums\Availability;
use App\Enums\Pathway;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property Availability|null $availability
 * @property Pathway|null $preferred_pathway
 */
class ApplicantProfile extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'user_id';

    protected $fillable = [
        'user_id', 'headline', 'phone_number', 'current_location', 'avatar_path',
        'professional_summary', 'default_cover_letter', 'is_visible_to_agencies',
        'availability', 'preferred_pathway',
    ];

    protected function casts(): array
    {
        return [
            'is_visible_to_agencies' => 'boolean',
            'availability' => Availability::class,
            'preferred_pathway' => Pathway::class,
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    /**
     * Where the signed-in owner's photo is served, or null without one. The
     * version query busts the browser cache when the photo changes.
     */
    public function avatarUrl(): ?string
    {
        return $this->avatar_path ? route('profile.avatar', ['v' => $this->updated_at?->timestamp]) : null;
    }
}
