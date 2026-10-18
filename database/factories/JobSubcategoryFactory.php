<?php

namespace Database\Factories;

use App\Models\JobCategory;
use App\Models\JobSubcategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobSubcategory>
 */
class JobSubcategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'job_category_id' => JobCategory::factory(),
            'subcategory_name' => fake()->unique()->jobTitle(),
            'sort_order' => 0,
        ];
    }
}
