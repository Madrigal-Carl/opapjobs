<?php

namespace App\Models;

use App\Enums\Pathway;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

class JobCategory extends Model
{
    use SoftDeletes;

    protected $fillable = ['pathway', 'category_name', 'sort_order'];

    protected function casts(): array
    {
        return ['pathway' => Pathway::class, 'sort_order' => 'integer'];
    }

    /** @return HasMany<JobSubcategory, $this> */
    public function subcategories(): HasMany
    {
        return $this->hasMany(JobSubcategory::class);
    }

    /** @return HasManyThrough<JobPost, JobSubcategory, $this> */
    public function jobPosts(): HasManyThrough
    {
        return $this->hasManyThrough(JobPost::class, JobSubcategory::class)->withTrashedParents();
    }
}
