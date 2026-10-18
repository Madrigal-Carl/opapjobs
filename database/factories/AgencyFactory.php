<?php

namespace Database\Factories;

use App\Enums\Pathway;
use App\Models\Agency;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Agency>
 */
class AgencyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'slug' => fake()->unique()->slug(),
            'agency_name' => fake()->unique()->company(),
            'pathway' => Pathway::Landbased,
            'dmw_license_number' => fake()->unique()->bothify('###-LB-????'),
            'headquarters_city' => fake()->city(),
            'agency_user_limit' => 10,
            'created_by_user_id' => User::factory()->superadmin(),
        ];
    }
}
