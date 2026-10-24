<?php

namespace App\Models;

use App\Enums\ContractType;
use App\Enums\Currency;
use App\Enums\EducationLevel;
use App\Enums\GenderRequirement;
use App\Enums\JobPostDisplayStatus;
use App\Enums\JobPostStatus;
use App\Enums\RecruitmentType;
use App\Models\Concerns\ScopedToUser;
use Database\Factories\JobPostFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Illuminate\Support\Carbon;

/**
 * @property JobPostStatus $status
 * @property RecruitmentType $recruitment_type
 * @property ContractType $contract_type
 * @property EducationLevel $education_level
 * @property Currency|null $salary_currency
 * @property Carbon|null $closing_date
 * @property string|null $other_requirements
 * @property string|null $job_order_number
 * @property list<string>|null $required_documents
 * @property-read JobPostDisplayStatus $display_status
 */
class JobPost extends Model
{
    /** @use HasFactory<JobPostFactory> */
    use HasFactory;

    use ScopedToUser;

    protected $attributes = ['status' => 'pending'];

    protected $fillable = [
        'agency_id', 'posted_by_user_id', 'employer_id', 'recruitment_type',
        'job_title', 'job_subcategory_id', 'work_location', 'vacant_positions',
        'contract_type', 'salary_currency', 'monthly_salary_min', 'monthly_salary_max',
        'education_level', 'min_experience_years', 'max_experience_years',
        'gender_requirement', 'job_description', 'other_requirements', 'application_instructions',
        'contact_person_name', 'contact_email', 'contact_phone', 'status',
        'closing_date', 'is_urgent', 'job_order_number', 'required_documents',
    ];

    protected function casts(): array
    {
        return [
            'recruitment_type' => RecruitmentType::class,
            'contract_type' => ContractType::class,
            'salary_currency' => Currency::class,
            'education_level' => EducationLevel::class,
            'gender_requirement' => GenderRequirement::class,
            'status' => JobPostStatus::class,
            'monthly_salary_min' => 'decimal:2',
            'monthly_salary_max' => 'decimal:2',
            'vacant_positions' => 'integer',
            'min_experience_years' => 'integer',
            'max_experience_years' => 'integer',
            'closing_date' => 'date',
            'is_urgent' => 'boolean',
            'required_documents' => 'array',
        ];
    }

    /** @return array{sql: literal-string, bindings: array{string}} */
    public static function displayStatusExpression(): array
    {
        return [
            'sql' => "CASE WHEN job_posts.status <> 'pending' THEN job_posts.status WHEN job_posts.closing_date < ? THEN 'expired' ELSE 'active' END",
            'bindings' => [now(config('app.timezone'))->toDateString()],
        ];
    }

    /** @return Attribute<JobPostDisplayStatus, never> */
    protected function displayStatus(): Attribute
    {
        return Attribute::make(get: fn (): JobPostDisplayStatus => match ($this->status) {
            JobPostStatus::Archived => JobPostDisplayStatus::Archived,
            JobPostStatus::Closed => JobPostDisplayStatus::Closed,
            JobPostStatus::Pending => $this->closing_date !== null
                && $this->closing_date->toDateString() < now(config('app.timezone'))->toDateString()
                    ? JobPostDisplayStatus::Expired
                    : JobPostDisplayStatus::Active,
        })->withoutObjectCaching();
    }

    /** @param Builder<static> $query */
    #[Scope]
    protected function notArchived(Builder $query): void
    {
        $query->where('job_posts.status', '!=', JobPostStatus::Archived);
    }

    /** @param Builder<static> $query */
    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('job_posts.status', JobPostStatus::Pending)
            ->where(fn (Builder $dates) => $dates->whereNull('job_posts.closing_date')
                ->orWhere('job_posts.closing_date', '>=', now(config('app.timezone'))->toDateString()));
    }

    /** @param Builder<static> $query */
    #[Scope]
    protected function expired(Builder $query): void
    {
        $query->where('job_posts.status', JobPostStatus::Pending)
            ->where('job_posts.closing_date', '<', now(config('app.timezone'))->toDateString());
    }

    /** @param Builder<static> $query */
    #[Scope]
    protected function whereDisplayStatus(Builder $query, JobPostDisplayStatus $status): void
    {
        match ($status) {
            JobPostDisplayStatus::Active => $query->active(),
            JobPostDisplayStatus::Expired => $query->expired(),
            JobPostDisplayStatus::Closed, JobPostDisplayStatus::Archived => $query->where('job_posts.status', $status->value),
        };
    }

    /** @param Builder<static> $query */
    #[Scope]
    protected function forAgency(Builder $query, int $agencyId): void
    {
        $query->where('job_posts.agency_id', $agencyId);
    }

    /** @return BelongsTo<Agency, $this> */
    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class)->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function poster(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by_user_id')->withTrashed();
    }

    /** @return BelongsTo<Employer, $this> */
    public function employer(): BelongsTo
    {
        return $this->belongsTo(Employer::class)->withTrashed();
    }

    /** @return BelongsTo<JobSubcategory, $this> */
    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(JobSubcategory::class, 'job_subcategory_id')->withTrashed();
    }

    /** @return HasOneThrough<JobCategory, JobSubcategory, $this> */
    public function category(): HasOneThrough
    {
        return $this->hasOneThrough(JobCategory::class, JobSubcategory::class, 'id', 'id', 'job_subcategory_id', 'job_category_id')
            ->withTrashedParents()->withTrashed();
    }

    /** @return HasMany<JobPostLanguage, $this> */
    public function languages(): HasMany
    {
        return $this->hasMany(JobPostLanguage::class);
    }

    /** @return HasMany<JobPostQuestion, $this> */
    public function questions(): HasMany
    {
        return $this->hasMany(JobPostQuestion::class);
    }

    /** @return HasMany<Application, $this> */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    /** @return BelongsToMany<User, $this, SavedJobPost> */
    public function savedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'saved_job_posts', 'job_post_id', 'applicant_user_id')
            ->using(SavedJobPost::class)->withPivot('created_at');
    }
}
