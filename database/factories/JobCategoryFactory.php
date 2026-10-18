<?php

namespace Database\Factories;

use App\Enums\Pathway;
use App\Models\JobCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobCategory>
 */
class JobCategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'pathway' => Pathway::Landbased,
            'category_name' => fake()->unique()->words(3, true),
            'sort_order' => 0,
        ];
    }
}
