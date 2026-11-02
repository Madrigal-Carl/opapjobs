<?php

namespace App\Models;

use App\Enums\Pathway;
use Database\Factories\AgencyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

/** @property Pathway $pathway */
class Agency extends Model
{
    /** @use HasFactory<AgencyFactory> */
    use HasFactory;

    use SoftDeletes;

    protected $fillable = [
        'slug', 'agency_name', 'pathway', 'dmw_license_number', 'agency_size',
        'headquarters_city', 'about', 'logo_path', 'year_established',
        'public_phone', 'public_email', 'public_address', 'facebook_url',
        'instagram_url', 'x_url', 'website_url', 'verified_at',
        'agency_user_limit', 'admin_user_id', 'suspended_at', 'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'pathway' => Pathway::class,
            'year_established' => 'integer',
            'agency_user_limit' => 'integer',
            'verified_at' => 'datetime',
            'suspended_at' => 'datetime',
        ];
    }

    /** @return HasMany<User, $this> */
    public function staffUsers(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /** @return BelongsTo<User, $this> */
    public function adminUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_user_id')->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id')->withTrashed();
    }

    /** @return HasMany<Employer, $this> */
    public function employers(): HasMany
    {
        return $this->hasMany(Employer::class);
    }

    /** @return HasMany<AgencyReview, $this> */
    public function reviews(): HasMany
    {
        return $this->hasMany(AgencyReview::class);
    }

    /** @return HasMany<JobPost, $this> */
    public function jobPosts(): HasMany
    {
        return $this->hasMany(JobPost::class);
    }

    /**
     * Applications on any of this Agency's job posts, whatever the job
     * post's status. Drives the derived hired count (never stored).
     *
     * @return HasManyThrough<Application, JobPost, $this>
     */
    public function applications(): HasManyThrough
    {
        return $this->hasManyThrough(Application::class, JobPost::class);
    }
}
