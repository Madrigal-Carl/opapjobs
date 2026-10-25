<?php

namespace Database\Factories;

use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StaffProfile>
 */
class StaffProfileFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'employee_id' => 'OPAP-'.str_pad((string) fake()->unique()->numberBetween(1000, 9999), 4, '0', STR_PAD_LEFT),
            'phone' => '+63 9'.fake()->numberBetween(10, 99).' '.fake()->numberBetween(100, 999).' '.fake()->numberBetween(1000, 9999),
            'notes' => null,
        ];
    }
}
