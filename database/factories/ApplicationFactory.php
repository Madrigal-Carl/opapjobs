<?php

namespace Database\Factories;

use App\Enums\ApplicationStage;
use App\Models\Application;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Application>
 */
class ApplicationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'job_post_id' => JobPost::factory(),
            'applicant_user_id' => User::factory()->applicant(),
            'stage' => ApplicationStage::Pending,
            'submitted_at' => now(),
        ];
    }

    public function pending(): static
    {
        return $this->state(['stage' => ApplicationStage::Pending]);
    }

    public function reviewed(): static
    {
        return $this->state(['stage' => ApplicationStage::Reviewed]);
    }

    public function shortlisted(): static
    {
        return $this->state(['stage' => ApplicationStage::Shortlisted]);
    }

    public function forInterview(): static
    {
        return $this->state(['stage' => ApplicationStage::ForInterview]);
    }

    public function endorsed(): static
    {
        return $this->state(['stage' => ApplicationStage::Endorsed]);
    }

    public function notSelected(): static
    {
        return $this->state(['stage' => ApplicationStage::NotSelected]);
    }
}
