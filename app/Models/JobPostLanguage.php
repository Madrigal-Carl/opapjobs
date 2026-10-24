<?php

namespace App\Models;

use App\Enums\Language;
use App\Enums\LanguageProficiency;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * @property Language $language
 * @property LanguageProficiency $proficiency
 */
class JobPostLanguage extends Pivot
{
    public $timestamps = false;

    protected $table = 'job_post_languages';

    protected $foreignKey = 'job_post_id';

    protected $relatedKey = 'language';

    protected $fillable = ['job_post_id', 'language', 'proficiency'];

    protected function casts(): array
    {
        return ['language' => Language::class, 'proficiency' => LanguageProficiency::class];
    }

    /** @return BelongsTo<JobPost, $this> */
    public function jobPost(): BelongsTo
    {
        return $this->belongsTo(JobPost::class);
    }
}
