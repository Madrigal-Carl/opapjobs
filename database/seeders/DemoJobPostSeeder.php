<?php

namespace Database\Seeders;

use App\Models\Agency;
use App\Models\JobPost;
use App\Models\JobPostQuestion;
use App\Models\JobSubcategory;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoJobPostSeeder extends Seeder
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
            $languages = [];
            $agencies = Agency::whereIn('slug', DemoAgencySeeder::SLUGS)->orderBy('id')->get();

            foreach ($agencies as $agencyIndex => $agency) {
                $pathway = $agency->getRawOriginal('pathway');
                $roles = array_values(array_filter(self::roles(), fn (array $role): bool => $role['pathway'] === $pathway));
                $employers = $agency->employers()->orderBy('id')->get();
                $staff = $agency->staffUsers()->withTrashed()->orderBy('id')->get();

                $postCount = max(12, $staff->count() * 4);

                for ($index = 0; $index < $postCount; $index++) {
                    $role = $roles[($index + $agencyIndex * 2) % count($roles)];
                    $employer = $employers[$index % $employers->count()];
                    $poster = $staff[intdiv($index, 4) % $staff->count()];
                    $location = $employer->employer_location;
                    [$currency, $rate] = match (true) {
                        $pathway === 'seabased' => ['USD', 100],
                        str_contains($location, 'Saudi Arabia') => ['SAR', 375],
                        str_contains($location, 'United Arab Emirates') => ['AED', 367],
                        str_contains($location, 'Qatar') => ['QAR', 364],
                        str_contains($location, 'Kuwait') => ['KWD', 31],
                        default => ['SGD', 135],
                    };
                    $minimum = intdiv($role['pay'] * $rate, 5000) * 50;
                    $created = $today->subDays(30 + ($postCount - 1 - $index) * 6 + $agencyIndex)->setHour(9);
                    $subcategory = JobSubcategory::where('subcategory_name', $role['subcategory'])
                        ->whereHas('category', fn ($query) => $query->where('pathway', $pathway))->firstOrFail();
                    $status = match ($index % 4) {
                        2 => 'closed', 3 => 'archived', default => 'pending'
                    };
                    $closingDate = match ($index % 4) {
                        0 => $index % 8 === 0 ? null : $today,
                        1 => $today->subDays(10),
                        default => $today->addDays(14 + $index * 2),
                    };
                    $recruitment = in_array($index, [2, 7, 10], true) ? 'manpooling' : 'joborder';
                    $workLocation = $pathway === 'seabased' ? 'International waters; joining in '.$location : $location;
                    $title = $role['title'].' — '.$location;
                    $job = JobPost::firstOrNew([
                        'agency_id' => $agency->id, 'posted_by_user_id' => $poster->id, 'job_title' => $title,
                    ]);
                    $description = "## The assignment\nJoin an established partner operation in {$workLocation} as a **{$role['title']}**. {$agency->agency_name} will coordinate your interview, document review and contract briefing. This is a hands-on position for someone who takes pride in reliable work, clear communication and respectful cooperation with colleagues.\n\n"
                        ."## Duties and requirements\n{$role['duties']}\n\n"
                        ."- Bring at least {$role['experience']} years of relevant experience and evidence of your **{$role['certificate']}**.\n"
                        .'- Be ready to discuss '.implode(', ', $role['skills'])." during the interview.\n"
                        ."- Follow approved safety procedures, report concerns promptly and maintain accurate handover records.\n\n"
                        ."## Pay and support\nThe monthly salary range is stated separately and will be confirmed in the written contract. The employment briefing covers accommodation or its allowance, transport arrangements, medical coverage, rest periods and leave. Review these details before accepting an offer. Recruitment staff will explain the next steps and will not ask applicants to pay through a personal account.";
                    $updated = match ($index % 4) {
                        2 => $created->addDays(14),
                        3 => $created->addDays(20),
                        default => $created,
                    };
                    $job->forceFill([
                        'posted_by_user_id' => $poster->id,
                        'employer_id' => in_array($index, [2, 10], true) ? null : $employer->id,
                        'recruitment_type' => $recruitment, 'job_subcategory_id' => $subcategory->id,
                        'work_location' => $workLocation, 'vacant_positions' => 6 + $index % 7,
                        'contract_type' => $pathway === 'seabased' || $index % 3 !== 0 ? 'fixed' : 'permanent',
                        'salary_currency' => $currency, 'monthly_salary_min' => $minimum,
                        'monthly_salary_max' => intdiv($minimum * 120, 100),
                        'education_level' => $role['education'], 'min_experience_years' => $role['experience'],
                        'max_experience_years' => $role['experience'] + 8, 'gender_requirement' => 'any',
                        'job_description' => $description,
                        'application_instructions' => $index % 3 === 0 ? null : 'Submit your current resume and relevant credentials through your account. A coordinator will contact shortlisted applicants using the verified agency email. Bring original documents only to a scheduled verification appointment.',
                        'contact_person_name' => $poster->name, 'contact_email' => $poster->email,
                        'contact_phone' => $agency->public_phone, 'status' => $status,
                        'closing_date' => $closingDate, 'is_urgent' => $index === 4,
                        'created_at' => $created, 'updated_at' => $updated,
                    ])->save();

                    $languages[] = ['job_post_id' => $job->id, 'language' => 'english', 'proficiency' => 'fluent'];
                    if (! str_contains($location, 'Singapore') && $index % 2 === 0) {
                        $languages[] = ['job_post_id' => $job->id, 'language' => 'arabic', 'proficiency' => 'basic'];
                    }
                    if ($index % 4 === 0) {
                        $languages[] = ['job_post_id' => $job->id, 'language' => $pathway === 'seabased' ? 'tagalog' : 'urdu', 'proficiency' => $pathway === 'seabased' ? 'fluent' : 'basic'];
                    }

                    $legacy = $agencyIndex === 0 && $index === 0;
                    $questions = [
                        [$legacy ? 'Have you completed your '.$role['certificate'].' assessment?' : 'Can you provide a current '.$role['certificate'].' credential?', 'yesno', 'Yes', true],
                        ['How many years have you worked in this occupation?', 'short', 'Describe your relevant work experience in years.', false],
                        ['Describe how you carry out '.strtolower($role['skills'][0]).' safely.', 'paragraph', 'Explain the preparation, safety checks and handover.', $index % 2 === 0],
                        ['Are you available for a scheduled video interview?', 'yesno', null, false],
                    ];
                    foreach (array_slice($questions, 0, $legacy ? 4 : $index % 5) as $sortOrder => [$text, $type, $expected, $required]) {
                        $question = JobPostQuestion::withTrashed()->firstOrNew(['job_post_id' => $job->id, 'sort_order' => $sortOrder]);
                        $deleted = $legacy && $sortOrder === 0 ? $today->subDays(20)->setHour(12) : null;
                        $question->forceFill([
                            'question_text' => $text, 'answer_type' => $type, 'expected_answer' => $expected,
                            'is_required' => $required, 'deleted_at' => $deleted,
                            'created_at' => $created->addMinutes(15), 'updated_at' => $deleted ?? $created->addMinutes(15),
                        ])->save();
                    }
                }
            }

            foreach (array_chunk($languages, 100) as $chunk) {
                DB::table('job_post_languages')->upsert($chunk, ['job_post_id', 'language'], ['proficiency']);
            }
        });
    }

    /** @return array<string, array{pathway: string, title: string, subcategory: string, education: string, pay: int, experience: int, skills: list<string>, certificate: string, company: string, duties: string}> */
    public static function roles(): array
    {
        return [
            'electrician' => [
                'pathway' => 'landbased', 'title' => 'Maintenance Electrician', 'subcategory' => 'Electrician',
                'education' => 'vocational', 'pay' => 900, 'experience' => 2,
                'skills' => ['Electrical fault finding', 'Circuit installation', 'Lockout procedures', 'Reading wiring diagrams'],
                'certificate' => 'Electrical Installation and Maintenance NC II', 'company' => 'Habagat Electrical Services',
                'duties' => 'Inspect distribution boards, trace electrical faults and complete planned maintenance on building circuits. Read drawings before starting work, isolate supplies with the responsible supervisor and test installations before returning them to service. Keep a clear record of repairs, materials used and unresolved defects so the next shift can work safely.',
            ],
            'welder' => [
                'pathway' => 'landbased', 'title' => 'Structural Welder', 'subcategory' => 'Welder / Fabricator',
                'education' => 'vocational', 'pay' => 850, 'experience' => 2,
                'skills' => ['Shielded metal arc welding', 'Joint preparation', 'Weld inspection', 'Fabrication drawings'],
                'certificate' => 'Shielded Metal Arc Welding NC II', 'company' => 'Bantayog Fabrication Works',
                'duties' => 'Prepare steel joints, check fit-up dimensions and weld structural assemblies to approved drawings. Select the specified consumables, control distortion and inspect completed welds before presenting work for quality review. Maintain safe hot-work boundaries, protect nearby workers from sparks and keep welding equipment ready for the next scheduled fabrication task.',
            ],
            'nurse' => [
                'pathway' => 'landbased', 'title' => 'Registered Staff Nurse', 'subcategory' => 'Registered Nurse',
                'education' => 'bachelor', 'pay' => 1800, 'experience' => 2,
                'skills' => ['Patient assessment', 'Medication safety', 'Clinical documentation', 'Infection prevention'],
                'certificate' => 'Professional Nursing Registration', 'company' => 'Hiraya Community Hospital',
                'duties' => 'Provide patient-centered nursing care, monitor observations and escalate changes to the clinical team promptly. Prepare safe medication rounds, maintain accurate care records and support patients and families with clear explanations. Participate in shift handovers, follow infection-prevention procedures and work within the destination licensing requirements confirmed during credential review.',
            ],
            'caregiver' => [
                'pathway' => 'landbased', 'title' => 'Residential Caregiver', 'subcategory' => 'Caregiver',
                'education' => 'vocational', 'pay' => 750, 'experience' => 1,
                'skills' => ['Personal care support', 'Safe patient transfers', 'Nutrition assistance', 'Care observations'],
                'certificate' => 'Caregiving NC II', 'company' => 'Silayan Assisted Living Cooperative',
                'duties' => 'Support adults with personal care, mobility and daily routines while preserving their dignity and independence. Follow the agreed care plan, record observations and report changes to the supervising nurse rather than making clinical decisions independently. Prepare the living area safely, assist with meals and communicate patiently with residents and their families.',
            ],
            'chef' => [
                'pathway' => 'landbased', 'title' => 'Sous Chef', 'subcategory' => 'Sous Chef',
                'education' => 'vocational', 'pay' => 1250, 'experience' => 4,
                'skills' => ['Kitchen service coordination', 'Food safety', 'Stock rotation', 'Menu preparation'],
                'certificate' => 'Cookery NC II', 'company' => 'Dalisay Garden Hospitality',
                'duties' => 'Support the head chef with preparation plans, station supervision and consistent presentation during busy service periods. Check food temperatures, manage stock rotation and brief cooks about allergies and menu changes before service begins. Coach junior team members, reduce avoidable waste and leave a clean, organized kitchen for the following shift.',
            ],
            'engineer' => [
                'pathway' => 'landbased', 'title' => 'Civil Site Engineer', 'subcategory' => 'Civil Engineer',
                'education' => 'bachelor', 'pay' => 2000, 'experience' => 3,
                'skills' => ['Site inspection', 'Construction drawings', 'Quantity measurement', 'Quality reporting'],
                'certificate' => 'Professional Civil Engineering Registration', 'company' => 'Balangay Civil Projects',
                'duties' => 'Coordinate daily civil works against approved drawings, inspection plans and site safety requirements. Check setting-out information, record quantities and raise technical questions before work proceeds beyond an inspection point. Work with foremen and quality staff to resolve discrepancies, maintain progress records and prepare accurate handover information for completed sections.',
            ],
            'seaman' => [
                'pathway' => 'seabased', 'title' => 'Able Seaman', 'subcategory' => 'Able Seaman',
                'education' => 'secondary', 'pay' => 1500, 'experience' => 1,
                'skills' => ['Deck watchkeeping', 'Mooring operations', 'Deck maintenance', 'Emergency drills'],
                'certificate' => 'STCW Basic Training and Rating Certification', 'company' => 'Harborlight Meridian Crewing',
                'duties' => 'Assist the deck officer with lookout duties, safe mooring operations and routine maintenance on deck equipment. Follow enclosed-space and working-aloft procedures, inspect assigned safety equipment and report defects without delay. Take part in emergency drills, maintain tidy work areas and complete reliable handovers during international vessel operations.',
            ],
            'bosun' => [
                'pathway' => 'seabased', 'title' => 'Bosun', 'subcategory' => 'Bosun',
                'education' => 'vocational', 'pay' => 2100, 'experience' => 3,
                'skills' => ['Deck team supervision', 'Mooring planning', 'Deck equipment care', 'Permit-to-work checks'],
                'certificate' => 'STCW Deck Rating Certification', 'company' => 'Habagat Bluewater Crewing',
                'duties' => 'Organize the deck ratings for planned maintenance, cargo support and mooring tasks under the chief officer. Brief the team on hazards, verify the correct tools and keep clear records of work completed. Monitor deck stores, coach less experienced crew and stop unsafe work until the responsible officer confirms suitable controls.',
            ],
            'motorman' => [
                'pathway' => 'seabased', 'title' => 'Motorman / Oiler', 'subcategory' => 'Motorman / Oiler',
                'education' => 'vocational', 'pay' => 1700, 'experience' => 2,
                'skills' => ['Machinery rounds', 'Lubrication systems', 'Engine room housekeeping', 'Maintenance assistance'],
                'certificate' => 'STCW Engine Rating Certification', 'company' => 'Silangan Engine Crew Services',
                'duties' => 'Carry out machinery rounds, check operating readings and assist engineers with scheduled maintenance in the engine room. Observe oil and coolant levels, report leaks early and keep access routes clear of tools and waste. Follow isolation instructions before maintenance, use protective equipment and record observations accurately for the watch engineer.',
            ],
            'marine-engineer' => [
                'pathway' => 'seabased', 'title' => 'Second Engineer', 'subcategory' => 'Second Engineer',
                'education' => 'bachelor', 'pay' => 6200, 'experience' => 4,
                'skills' => ['Marine machinery maintenance', 'Engine team leadership', 'Planned maintenance systems', 'Bunkering safety'],
                'certificate' => 'Second Engineer Certificate of Competency', 'company' => 'Bughaw Machinery Manning',
                'duties' => 'Lead daily engine-department maintenance under the chief engineer and maintain reliable operation of propulsion and auxiliary machinery. Plan work around vessel schedules, verify isolations and supervise repair quality before equipment returns to service. Review maintenance records, monitor spare parts and coach the engineering team on safe, efficient machinery operation.',
            ],
            'ship-cook' => [
                'pathway' => 'seabased', 'title' => 'Chief Cook', 'subcategory' => 'Chief Cook',
                'education' => 'vocational', 'pay' => 2100, 'experience' => 3,
                'skills' => ['Shipboard meal planning', 'Galley hygiene', 'Provision management', 'Dietary requirements'],
                'certificate' => 'Ship Cook Certification and STCW Basic Training', 'company' => 'Balangay Galley Services',
                'duties' => 'Prepare balanced meals for a multicultural crew and plan provisions around the vessel voyage schedule. Maintain galley hygiene, monitor chilled storage and accommodate confirmed dietary requirements without compromising food safety. Record stores consumption, coordinate replenishment requests and keep the catering team ready for inspections and emergency responsibilities.',
            ],
            'cruise-nurse' => [
                'pathway' => 'seabased', 'title' => 'Cruise Ship Nurse', 'subcategory' => 'Cruise Ship Nurse',
                'education' => 'bachelor', 'pay' => 3000, 'experience' => 3,
                'skills' => ['Emergency nursing', 'Passenger assessment', 'Medical records', 'Outbreak prevention'],
                'certificate' => 'Nursing Registration and STCW Basic Training', 'company' => 'Mutya Passenger Vessel Services',
                'duties' => 'Support the ship medical team with passenger assessment, emergency response and careful clinical documentation. Maintain treatment supplies, follow infection-control instructions and communicate sensitively with guests from different backgrounds. Participate in medical drills, prepare clear handovers and coordinate shoreside referrals through the ship physician when further treatment is required.',
            ],
        ];
    }
}
