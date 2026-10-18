<?php

namespace Database\Factories;

use App\Models\Agency;
use App\Models\Employer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employer>
 */
class EmployerFactory extends Factory
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
            'employer_name' => fake()->unique()->company(),
            'employer_location' => fake()->city().', '.fake()->country(),
            'employer_license_number' => fake()->bothify('DMW-####'),
        ];
    }
}
