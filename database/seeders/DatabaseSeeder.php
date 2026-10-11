<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RolesAndPermissionsSeeder::class);

        if (! app()->environment('local')) {
            return;
        }

        User::factory()->applicant()->create([
            'name' => 'Applicant',
            'email' => 'applicant@example.com',
        ]);

        User::factory()->employer()->create([
            'name' => 'Employer',
            'email' => 'employer@example.com',
        ]);

        User::factory()->admin()->create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
        ]);

        User::factory()->superadmin()->create([
            'name' => 'Superadmin',
            'email' => 'superadmin@example.com',
        ]);
    }
}
