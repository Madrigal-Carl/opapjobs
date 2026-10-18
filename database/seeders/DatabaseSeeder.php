<?php

namespace Database\Seeders;

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
        $this->call([RolesAndPermissionsSeeder::class, JobCategorySeeder::class]);

        if (app()->environment('local')) {
            $this->call([
                DemoAgencySeeder::class,
                DemoJobPostSeeder::class,
                DemoApplicantSeeder::class,
                DemoApplicationSeeder::class,
                DemoReviewSeeder::class,
                DemoAuditLogSeeder::class,
            ]);
        }
    }
}
