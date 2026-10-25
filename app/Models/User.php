<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property int|null $agency_id
 * @property int|null $created_by_user_id
 * @property Carbon|null $suspended_at
 * @property Carbon|null $last_login_at
 * @property Carbon|null $deleted_at
 */
#[Fillable(['name', 'email', 'password', 'agency_id', 'created_by_user_id', 'suspended_at', 'last_login_at'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, SoftDeletes, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'suspended_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Agency, $this> */
    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class)->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id')->withTrashed();
    }

    /** @return HasMany<User, $this> */
    public function createdUsers(): HasMany
    {
        return $this->hasMany(User::class, 'created_by_user_id');
    }

    /** @return HasMany<Agency, $this> */
    public function createdAgencies(): HasMany
    {
        return $this->hasMany(Agency::class, 'created_by_user_id');
    }

    /** @return HasOne<Agency, $this> */
    public function administeredAgency(): HasOne
    {
        return $this->hasOne(Agency::class, 'admin_user_id');
    }

    /** @return HasOne<ApplicantProfile, $this> */
    public function applicantProfile(): HasOne
    {
        return $this->hasOne(ApplicantProfile::class);
    }

    /** @return HasMany<ApplicantExperience, $this> */
    public function experiences(): HasMany
    {
        return $this->hasMany(ApplicantExperience::class, 'applicant_user_id');
    }

    /** @return HasMany<ApplicantEducation, $this> */
    public function education(): HasMany
    {
        return $this->hasMany(ApplicantEducation::class, 'applicant_user_id');
    }

    /** @return HasMany<ApplicantCertification, $this> */
    public function certifications(): HasMany
    {
        return $this->hasMany(ApplicantCertification::class, 'applicant_user_id');
    }

    /** @return HasMany<ApplicantSkill, $this> */
    public function skills(): HasMany
    {
        return $this->hasMany(ApplicantSkill::class, 'applicant_user_id');
    }

    /** @return HasMany<ApplicantDocument, $this> */
    public function documents(): HasMany
    {
        return $this->hasMany(ApplicantDocument::class, 'applicant_user_id');
    }

    /** @return BelongsToMany<JobPost, $this, SavedJobPost> */
    public function savedJobPosts(): BelongsToMany
    {
        return $this->belongsToMany(JobPost::class, 'saved_job_posts', 'applicant_user_id', 'job_post_id')
            ->using(SavedJobPost::class)->withPivot('created_at');
    }

    /** @return HasMany<Application, $this> */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'applicant_user_id');
    }

    /** @return HasMany<AgencyReview, $this> */
    public function reviewsWritten(): HasMany
    {
        return $this->hasMany(AgencyReview::class, 'applicant_user_id');
    }

    /** @return HasMany<JobPost, $this> */
    public function jobPostsPosted(): HasMany
    {
        return $this->hasMany(JobPost::class, 'posted_by_user_id');
    }

    /** @return HasMany<ApplicationStageHistory, $this> */
    public function stageChanges(): HasMany
    {
        return $this->hasMany(ApplicationStageHistory::class, 'changed_by_user_id');
    }

    /** @return HasMany<AuditLog, $this> */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'actor_user_id');
    }

    /** @return HasOne<StaffProfile, $this> */
    public function staffProfile(): HasOne
    {
        return $this->hasOne(StaffProfile::class);
    }
}
