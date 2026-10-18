<?php

namespace App\Models;

use App\Enums\ApplicationStage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApplicationStageHistory extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'application_stage_history';

    protected $fillable = ['application_id', 'from_stage', 'to_stage', 'changed_by_user_id', 'note', 'created_at'];

    protected function casts(): array
    {
        return ['from_stage' => ApplicationStage::class, 'to_stage' => ApplicationStage::class];
    }

    /** @return BelongsTo<Application, $this> */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /** @return BelongsTo<User, $this> */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id')->withTrashed();
    }
}
