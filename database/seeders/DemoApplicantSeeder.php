<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\JobPost;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoApplicantSeeder extends Seeder
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
            $today = CarbonImmutable::now(config('app.timezone'))->startOfDay();
            $password = Hash::make('password');
            $locations = ['Quezon City', 'Cebu City', 'Iloilo City', 'Davao City', 'Batangas City', 'Bacolod', 'Manila', 'Pasig'];
            $availabilities = ['immediately', 'within_2_weeks', 'within_1_month', 'more_than_1_month'];
            $levels = ['beginner', 'intermediate', 'advanced', 'expert'];
            $savedRows = [];

            foreach (self::applicants() as $index => $identity) {
                $name = $identity['name'];
                $pathway = $index < 24 ? 'landbased' : 'seabased';
                $roles = array_values(array_filter(DemoJobPostSeeder::roles(), fn (array $role): bool => $role['pathway'] === $pathway));
                $role = $roles[$index % count($roles)];
                $created = $today->subDays(150 - $index)->setHour(10);
                $profileCreated = $created->addDay();
                $user = DemoAgencySeeder::user($identity['email'], [
                    'name' => $name, 'agency_id' => null, 'created_by_user_id' => null,
                    'email_verified_at' => $created, 'suspended_at' => null, 'deleted_at' => null,
                    'created_at' => $created, 'updated_at' => $profileCreated,
                ], Role::Applicant, $password);
                $summary = 'I am an experienced '.$role['title'].' with a practical background in '.strtolower(implode(', ', $role['skills'])).'. My work has included the responsibilities described in my employment history, with a focus on safe procedures and dependable handovers. I am preparing for a '.$pathway.' opportunity and can discuss my experience and supporting credentials during an interview.';
                $user->applicantProfile()->updateOrCreate(['user_id' => $user->id], [
                    'headline' => $role['title'].' | '.implode(' and ', array_slice($role['skills'], 0, 2)),
                    'phone_number' => '+63 900 000 '.str_pad((string) (2000 + $index), 4, '0', STR_PAD_LEFT),
                    'current_location' => $locations[$index % count($locations)].', Philippines',
                    'avatar_path' => null, 'professional_summary' => $summary,
                    'default_cover_letter' => 'Please consider my application for a suitable '.$role['title'].' position. My resume records my employment, training and practical skills. I welcome an interview to discuss how my experience can support the team and will provide supporting documents through the agency verification process.',
                    'is_visible_to_agencies' => $index % 6 !== 0, 'availability' => $availabilities[$index % 4],
                    'preferred_pathway' => $pathway, 'created_at' => $profileCreated, 'updated_at' => $profileCreated,
                ]);

                for ($section = 0; $section < 1 + $index % 3; $section++) {
                    $started = $today->subYears([4, 7, 10][$section])->startOfYear();
                    $ended = $section === 0 ? null : $today->subYears($section === 1 ? 4 : 7)->startOfYear()->subMonth();
                    $user->experiences()->updateOrCreate(['sort_order' => $section], [
                        'job_role' => $role['title'], 'company_name' => $role['company'],
                        'started_on' => $started, 'ended_on' => $ended,
                        'work_location' => $pathway === 'seabased' ? 'International vessel assignments' : $locations[($index + $section) % count($locations)].', Philippines',
                        'responsibilities' => $role['duties'], 'created_at' => $profileCreated, 'updated_at' => $profileCreated,
                    ]);
                }

                $birthYear = 1982 + $index % 12;
                $degree = match ($role['education']) {
                    'bachelor' => str_contains($role['title'], 'Nurse') ? 'Bachelor of Science in Nursing' : ($pathway === 'seabased' ? 'Bachelor of Science in Marine Engineering' : 'Bachelor of Science in Civil Engineering'),
                    'secondary' => 'Senior High School Diploma',
                    default => 'Technical Diploma in '.$role['certificate'],
                };
                for ($section = 0; $section < 1 + $index % 2; $section++) {
                    $user->education()->updateOrCreate(['sort_order' => $section], [
                        'school_name' => $pathway === 'seabased' ? 'Hiraya Maritime Institute' : 'Maharlika Polytechnic College',
                        'degree' => $section === 0 ? $degree : 'Continuing Professional Skills Program',
                        'field_of_study' => $section === 0 ? $role['title'] : 'Occupational Safety and Team Communication',
                        'started_on' => ($birthYear + 18 + $section * 5).'-06-01',
                        'ended_on' => ($birthYear + ($role['education'] === 'bachelor' && $section === 0 ? 22 : 20) + $section * 5).'-03-31',
                        'created_at' => $profileCreated, 'updated_at' => $profileCreated,
                    ]);
                }

                $certificates = [$role['certificate'], 'Workplace First Aid and Emergency Response', 'Occupational Safety Refresher'];
                for ($section = 0; $section < $index % 4; $section++) {
                    $user->certifications()->updateOrCreate(['sort_order' => $section], [
                        'certification_name' => $certificates[$section],
                        'issuing_organization' => $pathway === 'seabased' ? 'Silangan Maritime Training Center' : 'Hiraya Skills Assessment Center',
                        'issued_on' => $today->subMonths(6 + $section * 12)->toDateString(),
                        'expires_on' => $section === 2 ? $today->subMonths(2)->toDateString() : null,
                        'credential_url' => $index % 3 === 0 ? 'https://credentials.example.test/'.Str::slug($name).'/'.($section + 1) : null,
                        'created_at' => $profileCreated, 'updated_at' => $profileCreated,
                    ]);
                }

                foreach ($role['skills'] as $sortOrder => $skill) {
                    $user->skills()->updateOrCreate(['skill_name' => $skill], [
                        'skill_level' => $levels[($index + $sortOrder) % 4], 'sort_order' => $sortOrder,
                        'created_at' => $profileCreated, 'updated_at' => $profileCreated,
                    ]);
                }

                for ($documentIndex = 0; $documentIndex < 1 + $index % 3; $documentIndex++) {
                    $type = $documentIndex === 0 ? 'resume' : ($documentIndex === 1 ? 'certificate' : ['resume', 'passport', 'other'][intdiv($index, 3) % 3]);
                    $extension = $documentIndex === 2 && $type === 'resume' ? 'docx' : 'pdf';
                    $filename = str_replace(' ', '_', $name).'_'.match ($type) {
                        'resume' => $documentIndex === 0 ? 'Resume' : 'Detailed_Resume',
                        'certificate' => 'Training_Certificate', 'passport' => 'Passport', default => 'Work_References',
                    }.'.'.$extension;
                    $uploaded = $today->subDays(100 - $documentIndex)->setHour(11);
                    $document = $user->documents()->withTrashed()->firstOrNew(['original_file_name' => $filename]);
                    $document->forceFill([
                        'document_type' => $type, 'storage_path' => 'applicants/'.$user->id.'/documents/'.$filename,
                        'mime_type' => $extension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'file_size_bytes' => 160000 + $index * 8123 + $documentIndex * 40000,
                        'is_primary' => $documentIndex === 0, 'uploaded_at' => $uploaded,
                        'deleted_at' => null, 'created_at' => $uploaded, 'updated_at' => $uploaded,
                    ])->save();
                }

                $active = JobPost::active()->whereHas('agency', fn ($query) => $query->whereNull('suspended_at'))
                    ->whereHas('subcategory.category', fn ($query) => $query->where('pathway', $pathway))->orderBy('id')->get();
                for ($savedIndex = 0; $savedIndex < min($index % 7, $active->count()); $savedIndex++) {
                    $savedRows[] = [
                        'applicant_user_id' => $user->id, 'job_post_id' => $active[($index * 3 + $savedIndex) % $active->count()]->id,
                        'created_at' => $today->subDay()->setHour(16),
                    ];
                }
            }

            foreach (array_chunk($savedRows, 100) as $chunk) {
                DB::table('saved_job_posts')->upsert($chunk, ['applicant_user_id', 'job_post_id'], ['created_at']);
            }
        });
    }

    /** @return list<array{name: string, email: string}> */
    public static function applicants(): array
    {
        $names = [
            'Juan Dela Cruz', 'Maria Lacsamana', 'Angelo Dimaculangan', 'Patricia Balagtas',
            'Jerome Macapagal', 'Camille Alonzo', 'Ramon Ilagan', 'Kristine Sarmiento',
            'Adrian Malvar', 'Joanna Dizon', 'Mark Anthony Palomares', 'Elaine Rosales',
            'Dennis Magbanua', 'Michelle Escalante', 'Ronald Magsino', 'Abigail Pineda',
            'Francis Bagatsing', 'Kathleen Sumulong', 'Emmanuel Cordero', 'Rose Ann Macaraig',
            'Victor Magtanggol', 'Andrea Buencamino', 'Nathaniel Lucero', 'Carla Pangilinan',
            'Roberto Maliksi', 'Jessa Fuentebella', 'Arvin Mendiola', 'Nicole Tabora',
            'Christian Ocampo', 'Maricel Atienza', 'Eduardo Banayo', 'Alyssa Maghirang',
            'Wilfredo Salonga', 'Clarisse Tecson', 'Noel Almeda', 'Danica Estrella',
            'Leandro Samonte', 'Rochelle Manansala', 'Benedict Tuazon', 'Isabel Valmoria',
        ];

        return array_map(fn (string $name, int $index): array => [
            'name' => $name, 'email' => $index === 0 ? 'applicant@example.test' : Str::slug($name, '.').'@example.test',
        ], $names, array_keys($names));
    }
}
