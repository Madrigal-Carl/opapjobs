<?php

namespace Database\Seeders;

use App\Enums\Pathway;
use App\Enums\Role;
use App\Models\Agency;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LocalDemoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (! app()->environment('local')) {
            return;
        }

        DB::transaction(function (): void {
            $superadmin = User::firstOrCreate(['email' => 'superadmin@example.test'], [
                'name' => 'Demo Superadmin',
                'password' => 'password',
            ]);
            $superadmin->forceFill(['email_verified_at' => $superadmin->email_verified_at ?? now()])->save();
            $superadmin->assignRole(Role::Superadmin->value);

            $agency = Agency::updateOrCreate(['slug' => 'demo-recruitment-agency'], [
                'agency_name' => 'Demo Recruitment Agency',
                'pathway' => Pathway::Landbased,
                'dmw_license_number' => 'DEMO-AGENCY-001',
                'headquarters_city' => 'Demo City',
                'agency_user_limit' => 2,
                'created_by_user_id' => $superadmin->id,
            ]);

            $admin = User::updateOrCreate(['email' => 'admin@example.test'], [
                'name' => 'Demo Agency Admin',
                'password' => 'password',
                'agency_id' => $agency->id,
                'created_by_user_id' => $superadmin->id,
            ]);
            $admin->forceFill(['email_verified_at' => $admin->email_verified_at ?? now()])->save();
            $agency->update(['admin_user_id' => $admin->id]);
            $admin->assignRole(Role::Admin->value);

            foreach ([1, 2] as $number) {
                $staff = User::updateOrCreate(['email' => "agency{$number}@example.test"], [
                    'name' => "Demo Agency User {$number}",
                    'password' => 'password',
                    'agency_id' => $agency->id,
                    'created_by_user_id' => $admin->id,
                ]);
                $staff->forceFill(['email_verified_at' => $staff->email_verified_at ?? now()])->save();
                $staff->assignRole(Role::Agency->value);

                $agency->employers()->firstOrCreate(['employer_name' => "Demo Employer {$number}"], [
                    'employer_location' => 'Demo City, Example Country',
                    'employer_license_number' => "DEMO-EMPLOYER-00{$number}",
                ]);
            }

            $applicant = User::firstOrCreate(['email' => 'applicant@example.test'], [
                'name' => 'Demo Applicant',
                'password' => 'password',
            ]);
            $applicant->forceFill(['email_verified_at' => $applicant->email_verified_at ?? now()])->save();
            $applicant->assignRole(Role::Applicant->value);

            User::firstOrCreate(['email' => 'unverified-applicant@example.test'], [
                'name' => 'Demo Unverified Applicant',
                'password' => 'password',
            ])->assignRole(Role::Applicant->value);
        });
    }
}
