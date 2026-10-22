<?php

namespace Database\Factories;

use App\Enums\ContractType;
use App\Enums\EducationLevel;
use App\Enums\JobPostStatus;
use App\Enums\RecruitmentType;
use App\Models\Agency;
use App\Models\JobCategory;
use App\Models\JobPost;
use App\Models\JobSubcategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobPost>
 */
class JobPostFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'agency_id' => Agency::factory(),
            'posted_by_user_id' => fn (array $attributes) => User::factory()->agency()
                ->forAgency(Agency::query()->whereKey($attributes['agency_id'])->firstOrFail())->create()->id,
            'job_subcategory_id' => fn (array $attributes) => JobSubcategory::factory()
                ->for(JobCategory::factory()->state([
                    'pathway' => Agency::query()->whereKey($attributes['agency_id'])->firstOrFail()->pathway,
                ]), 'category')->create()->id,
            'recruitment_type' => RecruitmentType::Joborder,
            'job_order_number' => fn (array $attributes): ?string => in_array($attributes['recruitment_type'], [RecruitmentType::Joborder, RecruitmentType::Joborder->value], true)
                ? 'JO-'.now()->year.'-'.fake()->unique()->numerify('######') : null,
            'job_title' => fake()->jobTitle(),
            'work_location' => fake()->city().', '.fake()->country(),
            'vacant_positions' => 1,
            'contract_type' => ContractType::Fixed,
            'education_level' => EducationLevel::Secondary,
            'job_description' => fake()->paragraph(),
            'other_requirements' => null,
            'status' => JobPostStatus::Pending,
            'closing_date' => null,
            'is_urgent' => false,
        ];
    }

    public function forPoster(User $user): static
    {
        return $this->state(['agency_id' => $user->agency_id, 'posted_by_user_id' => $user->id]);
    }

    public function pending(): static
    {
        return $this->state(['status' => JobPostStatus::Pending]);
    }

    public function closed(): static
    {
        return $this->state(['status' => JobPostStatus::Closed]);
    }

    public function archived(): static
    {
        return $this->state(['status' => JobPostStatus::Archived]);
    }

    public function expiredByDate(): static
    {
        return $this->pending()->state(['closing_date' => now(config('app.timezone'))->subDay()->toDateString()]);
    }

    public function closingToday(): static
    {
        return $this->pending()->state(['closing_date' => now(config('app.timezone'))->toDateString()]);
    }

    public function neverExpires(): static
    {
        return $this->pending()->state(['closing_date' => null]);
    }

    public function manpooling(): static
    {
        return $this->state(['recruitment_type' => RecruitmentType::Manpooling]);
    }
}
