<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Agency;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoAgencySeeder extends Seeder
{
    public const SLUGS = [
        'salinlahi-global-careers', 'amihan-bridge-recruitment', 'bayani-horizon-placement',
        'layag-meridian-maritime', 'tala-crest-marine-careers',
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (! app()->environment('local')) {
            return;
        }

        DB::transaction(function (): void {
            $today = CarbonImmutable::now(config('app.timezone'))->startOfDay();
            $password = Hash::make('password');
            $superadmin = self::user('superadmin@example.test', [
                'name' => 'Alessandra Mercado', 'agency_id' => null, 'created_by_user_id' => null,
                'email_verified_at' => $today->subDays(400), 'created_at' => $today->subDays(400),
                'updated_at' => $today->subDays(400), 'suspended_at' => null, 'deleted_at' => null,
            ], Role::Superadmin, $password);

            $agencies = [
                [
                    'name' => 'Salinlahi Global Careers', 'pathway' => 'landbased', 'city' => 'Makati',
                    'year' => 1998, 'size' => '45 recruitment and deployment specialists', 'limit' => 4,
                    'admin' => 'Mariel Santos', 'staff' => ['Carlo Navarro', 'Rina Villanueva', 'Paolo Reyes'],
                    'about' => 'Salinlahi Global Careers supports skilled Filipino workers pursuing construction, healthcare and hospitality opportunities overseas. Our recruitment coordinators explain each document requirement, arrange practical interviews and stay in contact through deployment. Candidates receive a written employment briefing and a named contact for questions before accepting an offer.',
                    'employers' => [
                        ['Najmora Infrastructure Services', 'Riyadh, Saudi Arabia'],
                        ['Qamari Care Group', 'Doha, Qatar'],
                        ['Miraf Dunes Hospitality', 'Dubai, United Arab Emirates'],
                        ['Straits Orchard Engineering', 'Singapore, Singapore'],
                    ],
                ],
                [
                    'name' => 'Amihan Bridge Recruitment', 'pathway' => 'landbased', 'city' => 'Pasig',
                    'year' => 2006, 'size' => 'Small team (15–25 staff)', 'limit' => 3,
                    'admin' => 'Gabriel Bautista', 'staff' => ['Dianne Salcedo', 'Miguel Soriano'],
                    'about' => 'Amihan Bridge Recruitment works with technical and care-service teams in the Gulf and Singapore. We focus on realistic job previews, clear salary information and careful preparation for employer interviews. Our Pasig office assists applicants with credential checks and offers scheduled consultations rather than requiring repeated walk-in visits.',
                    'employers' => [
                        ['Rimalis Technical Works', 'Kuwait City, Kuwait'],
                        ['Sahline Community Health', 'Abu Dhabi, United Arab Emirates'],
                        ['Lusara Project Partners', 'Doha, Qatar'],
                        ['Juniper Quay Services', 'Singapore, Singapore'],
                    ],
                ],
                [
                    'name' => 'Bayani Horizon Placement', 'pathway' => 'landbased', 'city' => 'Cebu',
                    'year' => 2015, 'size' => '32 staff across two candidate-support teams', 'limit' => 6,
                    'admin' => 'Celina Ramos', 'staff' => ['Anton Velasco', 'Beatriz Manalo', 'Luis Fajardo', 'Nica Domingo'],
                    'about' => 'Bayani Horizon Placement connects candidates from the Visayas with overseas employers needing experienced tradespeople, nurses and culinary professionals. Our Cebu coordinators help applicants organize evidence of their skills and understand the working conditions of each destination. We emphasize respectful communication and provide updates after scheduled selection activities.',
                    'employers' => [
                        ['Nawara Industrial Projects', 'Dammam, Saudi Arabia'],
                        ['Hadeer Palm Residences', 'Sharjah, United Arab Emirates'],
                        ['Sufara Clinical Services', 'Lusail, Qatar'],
                        ['Cedar Jetty Facilities', 'Singapore, Singapore'],
                    ],
                ],
                [
                    'name' => 'Layag Meridian Maritime', 'pathway' => 'seabased', 'city' => 'Manila',
                    'year' => 1995, 'size' => '120+ crewing and marine-support staff', 'limit' => 5,
                    'admin' => 'Rafael Tolentino', 'staff' => ['Inez Panganiban', 'Marco Evangelista', 'Sofia Caballero'],
                    'about' => 'Layag Meridian Maritime prepares Filipino deck, engine and hotel personnel for international vessel assignments. Our Manila crewing desk coordinates document verification, medical schedules and joining instructions with ship managers. Seafarers receive a clear contract briefing, an emergency contact and practical guidance for travel to their embarkation port.',
                    'employers' => [
                        ['Meridian Shoal Shipmanagement', 'Singapore, Singapore'],
                        ['Azure Keel Marine Operations', 'Dubai, United Arab Emirates'],
                        ['North Shoal Vessel Services', 'Doha, Qatar'],
                        ['Coral Estuary Shipping', 'Dammam, Saudi Arabia'],
                    ],
                ],
                [
                    'name' => 'Tala Crest Marine Careers', 'pathway' => 'seabased', 'city' => 'Quezon City',
                    'year' => 2020, 'size' => 'Boutique crewing office with 12 staff', 'limit' => 3,
                    'admin' => 'Teresa Almario', 'staff' => ['Joaquin Abad', 'Lara Montemayor'],
                    'about' => 'Tala Crest Marine Careers specializes in matching experienced Filipino seafarers with deck, machinery and catering assignments. Our Quezon City team provides individual document reviews and written joining checklists. Existing crew and their families retain a named support contact while the office completes an administrative compliance review.',
                    'employers' => [
                        ['Silver Current Fleet Services', 'Singapore, Singapore'],
                        ['Pelagic Lantern Marine', 'Abu Dhabi, United Arab Emirates'],
                        ['East Sound Shipmanagement', 'Kuwait City, Kuwait'],
                        ['Cobalt Reef Vessel Partners', 'Doha, Qatar'],
                    ],
                ],
            ];

            foreach ($agencies as $index => $data) {
                $created = $today->subDays(360 - $index * 10)->setHour(8);
                $agency = Agency::withTrashed()->firstOrNew(['slug' => self::SLUGS[$index]]);
                $agency->forceFill([
                    'agency_name' => $data['name'], 'pathway' => $data['pathway'],
                    'dmw_license_number' => (901 + $index).'-'.($data['pathway'] === 'landbased' ? 'LB' : 'SB').'-0425-FICT',
                    'agency_size' => $data['size'], 'headquarters_city' => $data['city'],
                    'year_established' => $data['year'], 'about' => $data['about'], 'logo_path' => null,
                    'public_phone' => '+63 900 000 '.str_pad((string) (1000 + $index), 4, '0', STR_PAD_LEFT),
                    'public_email' => 'careers@'.self::SLUGS[$index].'.example.test',
                    'public_address' => $index === 4 ? null : 'Suite '.(201 + $index).', Maharlika Trade Center, '.$data['city'].', Philippines',
                    'facebook_url' => $index < 3 ? 'https://social.example.test/'.self::SLUGS[$index] : null,
                    'instagram_url' => $index === 0 ? 'https://photos.example.test/salinlahi-careers' : null,
                    'x_url' => null, 'website_url' => $index < 4 ? 'https://'.self::SLUGS[$index].'.example.test' : null,
                    'verified_at' => $index < 3 ? $created->addDays(30) : null,
                    'agency_user_limit' => $data['limit'], 'created_by_user_id' => $superadmin->id,
                    'suspended_at' => $index === 4 ? $today->subDays(2)->setHour(14) : null,
                    'deleted_at' => null, 'created_at' => $created,
                    'updated_at' => $index === 4 ? $today->subDays(2)->setHour(14) : $created->addDays(30),
                ])->save();

                $admin = User::withTrashed()->firstOrNew([
                    'email' => $index === 0 ? 'admin@example.test' : 'admin@'.self::SLUGS[$index].'.example.test',
                ]);
                $admin->forceFill([
                    'name' => $data['admin'], 'agency_id' => $agency->id, 'created_by_user_id' => $superadmin->id,
                    'email_verified_at' => $created->addDay(), 'created_at' => $created->addDay(),
                    'updated_at' => $created->addDay(), 'suspended_at' => null, 'deleted_at' => null,
                    'password' => $admin->password ?? $password,
                ])->save();
                DB::table('agencies')->where('id', $agency->id)->update(['admin_user_id' => $admin->id]);
                $admin->syncRoles([Role::Admin->value]);

                foreach ($data['staff'] as $staffIndex => $name) {
                    $staffCreated = $created->addDays(2 + $staffIndex);
                    $staffUser = self::user($index === 0 && $staffIndex < 2
                        ? 'agency'.($staffIndex + 1).'@example.test'
                        : 'coordinator'.($staffIndex + 1).'@'.self::SLUGS[$index].'.example.test', [
                            'name' => $name, 'agency_id' => $agency->id, 'created_by_user_id' => $admin->id,
                            'email_verified_at' => $staffCreated, 'created_at' => $staffCreated,
                            'updated_at' => $today->subDays(3)->setHour(12),
                            'suspended_at' => $index === 1 && $staffIndex === 0 ? $today->subDays(3)->setHour(12) : null,
                            'deleted_at' => $index === 2 && $staffIndex === 3 ? $today->subDays(3)->setHour(12) : null,
                        ], Role::Agency, $password);

                    $staffUser->staffProfile()->firstOrCreate([], [
                        'phone' => '+63 9'.sprintf('%02d', 10 + $index).sprintf('%03d', 100 + $staffIndex).' '.sprintf('%04d', 1000 + $staffIndex),
                        'notes' => null,
                    ]);
                }

                foreach ($data['employers'] as $employerIndex => [$name, $location]) {
                    $employer = $agency->employers()->withTrashed()->firstOrNew(['employer_name' => $name]);
                    $employer->forceFill([
                        'employer_location' => $location,
                        'employer_license_number' => 'FICT-EMP-'.(901 + $index).'-'.($employerIndex + 1),
                        'deleted_at' => null, 'created_at' => $created->addDays(10), 'updated_at' => $created->addDays(10),
                    ])->save();
                }
            }
        });
    }

    /** @param array<string, mixed> $attributes */
    public static function user(string $email, array $attributes, Role $role, string $password): User
    {
        $user = User::withTrashed()->firstOrNew(['email' => $email]);
        $user->forceFill([...$attributes, 'password' => $user->password ?? $password])->save();
        $user->syncRoles([$role->value]);

        return $user;
    }
}
