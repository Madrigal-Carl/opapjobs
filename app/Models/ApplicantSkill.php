<?php

namespace App\Models;

use App\Enums\SkillLevel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApplicantSkill extends Model
{
    protected $fillable = ['applicant_user_id', 'skill_name', 'skill_level', 'sort_order'];

    protected function casts(): array
    {
        return ['skill_level' => SkillLevel::class, 'sort_order' => 'integer'];
    }

    /** @return BelongsTo<User, $this> */
    public function applicant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applicant_user_id')->withTrashed();
    }
}
