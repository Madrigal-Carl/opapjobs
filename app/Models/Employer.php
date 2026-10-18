<?php

namespace App\Models;

use Database\Factories\EmployerFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employer extends Model
{
    /** @use HasFactory<EmployerFactory> */
    use HasFactory;

    use SoftDeletes;

    protected $fillable = ['agency_id', 'employer_name', 'employer_location', 'employer_license_number'];

    /** @return BelongsTo<Agency, $this> */
    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class)->withTrashed();
    }

    /** @return HasMany<JobPost, $this> */
    public function jobPosts(): HasMany
    {
        return $this->hasMany(JobPost::class);
    }
}
