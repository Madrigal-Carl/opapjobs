<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Agency;
use App\Models\AgencyReview;
use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\Employer;
use App\Models\JobPost;
use App\Models\JobSubcategory;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Local-only display data for the applicant-side pages: enough public
 * agencies to paginate both directory tabs, a clear hired-applicant ranking,
 * several batches of active job posts and a spread of reviews. Hidden
 * agencies and non-active job posts are seeded too, so filtering is visible.
 *
 * Everything is keyed by slug, email or (agency, job title), so running the
 * seeder again updates rows in place instead of adding new ones.
 */
class DemoPublicCatalogSeeder extends Seeder
{
    private const APPLICANT_POOL_SIZE = 60;

    private const STAGE_PATH = ['pending', 'reviewed', 'shortlisted', 'interviewed', 'hired'];

    private const NON_HIRED_STAGES = ['pending', 'reviewed', 'shortlisted', 'interviewed', 'rejected'];

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
            $now = CarbonImmutable::now();
            $password = Hash::make('password');
            $superadmin = User::withTrashed()->where('email', 'superadmin@example.test')->first()
                ?? DemoAgencySeeder::user('superadmin@example.test', [
                    'name' => 'Alessandra Mercado', 'agency_id' => null, 'created_by_user_id' => null,
                    'email_verified_at' => $today->subDays(400), 'created_at' => $today->subDays(400),
                    'updated_at' => $today->subDays(400), 'suspended_at' => null, 'deleted_at' => null,
                ], Role::Superadmin, $password);

            $applicants = $this->applicantPool($today, $password);
            $activeOrdinal = ['landbased' => 0, 'seabased' => 0];
            $applicationRows = [];

            foreach (self::agencies() as $index => $definition) {
                $agency = $this->seedAgency($index, $definition, $superadmin, $today, $password);
                $employers = $this->seedEmployers($agency, $index, $definition['pathway'], $today);
                $posts = $this->seedJobPosts($agency, $index, $definition, $employers, $today, $now, $activeOrdinal);
                $applicationRows = [...$applicationRows, ...$this->planApplications($posts, $definition['hired'], $index, $applicants, $now)];
                $this->seedReviews($agency, $index, $definition['reviews'], $applicants, $today);
            }

            $this->seedApplications($applicationRows, $now);
        });

        $this->printSummary();
    }

    /** @return list<User> */
    private function applicantPool(CarbonImmutable $today, string $password): array
    {
        $first = ['Mariel', 'Joel', 'Andrea', 'Ramon', 'Kristine', 'Paolo', 'Liza', 'Dennis', 'Joy', 'Arnel', 'Rhea', 'Mark'];
        $last = ['Santos', 'Dizon', 'Ocampo', 'Garcia', 'Lim', 'Aquino', 'Pascual', 'Ramos', 'Cruz', 'Torres'];
        $pool = [];

        for ($index = 0; $index < self::APPLICANT_POOL_SIZE; $index++) {
            $created = $today->subDays(120 - $index);
            $user = DemoAgencySeeder::user(sprintf('catalog.applicant%02d@example.test', $index + 1), [
                'name' => $first[$index % count($first)].' '.$last[intdiv($index, count($first)) % count($last)],
                'agency_id' => null, 'created_by_user_id' => null,
                'email_verified_at' => $created, 'created_at' => $created, 'updated_at' => $created,
                'suspended_at' => null, 'deleted_at' => null,
            ], Role::Applicant, $password);

            ApplicantProfile::query()->updateOrCreate(['user_id' => $user->id], [
                'headline' => 'Overseas job seeker', 'current_location' => 'Metro Manila, Philippines',
                'is_visible_to_agencies' => $index % 4 !== 0,
                'preferred_pathway' => $index % 2 === 0 ? 'landbased' : 'seabased',
            ]);
            $pool[] = $user;
        }

        return $pool;
    }

    /** @param array{name: string, pathway: string, city: string, year: int, size: string, active: int, hired: int, reviews: int, hidden?: string} $definition */
    private function seedAgency(int $index, array $definition, User $superadmin, CarbonImmutable $today, string $password): Agency
    {
        $slug = Str::slug($definition['name']);
        $created = $today->subDays(300 - $index * 3)->setHour(9);
        $code = $definition['pathway'] === 'landbased' ? 'LB' : 'SB';
        $agency = Agency::withTrashed()->firstOrNew(['slug' => $slug]);
        $agency->forceFill([
            'agency_name' => $definition['name'], 'pathway' => $definition['pathway'],
            'dmw_license_number' => sprintf('%03d-%s-%04d-FICT', 930 + $index, $code, 1100 + $index),
            'agency_size' => $definition['size'], 'headquarters_city' => $definition['city'],
            'year_established' => $definition['year'],
            'about' => "{$definition['name']} is a fictional demo agency based in {$definition['city']}. Our coordinators explain each document requirement, arrange interviews with partner employers and stay in contact with applicants until deployment. Every candidate receives a written employment briefing and a named contact for questions.",
            'logo_path' => null,
            'public_phone' => $index % 6 === 5 ? null : '+63 900 100 '.str_pad((string) (2000 + $index), 4, '0', STR_PAD_LEFT),
            'public_email' => 'hello@'.$slug.'.example.test',
            'public_address' => $index % 4 === 3 ? null : 'Unit '.(300 + $index).', Kalayaan Business Tower, '.$definition['city'].', Philippines',
            'facebook_url' => $index % 3 === 0 ? 'https://social.example.test/'.$slug : null,
            'instagram_url' => $index % 4 === 1 ? 'https://photos.example.test/'.$slug : null,
            'x_url' => $index % 5 === 2 ? 'https://x.example.test/'.$slug : null,
            'website_url' => $index % 2 === 0 ? 'https://'.$slug.'.example.test' : null,
            'verified_at' => $index % 5 === 3 ? null : $created->addDays(20 + $index),
            'agency_user_limit' => 3, 'created_by_user_id' => $superadmin->id,
            'suspended_at' => ($definition['hidden'] ?? null) === 'suspended' ? $today->subDays(4)->setHour(10) : null,
            'deleted_at' => ($definition['hidden'] ?? null) === 'deleted' ? $today->subDays(6)->setHour(10) : null,
            'created_at' => $created, 'updated_at' => $created->addDays(20),
        ])->save();

        $admin = DemoAgencySeeder::user('admin@'.$slug.'.example.test', [
            'name' => 'Admin '.$definition['city'], 'agency_id' => $agency->id, 'created_by_user_id' => $superadmin->id,
            'email_verified_at' => $created->addDay(), 'created_at' => $created->addDay(), 'updated_at' => $created->addDay(),
            'suspended_at' => null, 'deleted_at' => null,
        ], Role::Admin, $password);
        DB::table('agencies')->where('id', $agency->id)->update(['admin_user_id' => $admin->id]);

        DemoAgencySeeder::user('recruiter@'.$slug.'.example.test', [
            'name' => 'Recruiter '.$definition['city'], 'agency_id' => $agency->id, 'created_by_user_id' => $admin->id,
            'email_verified_at' => $created->addDays(2), 'created_at' => $created->addDays(2), 'updated_at' => $created->addDays(2),
            'suspended_at' => null, 'deleted_at' => null,
        ], Role::Agency, $password);

        return $agency;
    }

    /** @return list<Employer> */
    private function seedEmployers(Agency $agency, int $index, string $pathway, CarbonImmutable $today): array
    {
        $prefixes = ['Sahara Crest', 'Pearl Gulf', 'Northwind', 'Lumen Bay', 'Coral Mesa', 'Silver Dune', 'Harbor Pine', 'Amber Reef', 'Kestrel Line', 'Opal Ridge'];
        $suffixes = $pathway === 'landbased'
            ? ['Facilities Group', 'Care Services', 'Hospitality Partners', 'Technical Works']
            : ['Shipmanagement', 'Marine Operations', 'Vessel Services', 'Offshore Partners'];
        $locations = array_keys(self::destinations());
        $employers = [];

        for ($slot = 0; $slot < 3 + $index % 2; $slot++) {
            $name = $prefixes[($index + $slot * 3) % count($prefixes)].' '.$suffixes[($index + $slot) % count($suffixes)];
            $employer = Employer::withTrashed()->firstOrNew(['agency_id' => $agency->id, 'employer_name' => $name]);
            $employer->forceFill([
                'employer_location' => $locations[($index * 2 + $slot) % count($locations)],
                'employer_license_number' => sprintf('FICT-EMP-%03d-%d', 930 + $index, $slot + 1),
                'deleted_at' => null, 'created_at' => $today->subDays(200), 'updated_at' => $today->subDays(200),
            ])->save();
            $employers[] = $employer;
        }

        return $employers;
    }

    /**
     * @param  array{name: string, pathway: string, city: string, year: int, size: string, active: int, hired: int, reviews: int, hidden?: string}  $definition
     * @param  list<Employer>  $employers
     * @param  array<string, int>  $activeOrdinal
     * @return list<JobPost>
     */
    private function seedJobPosts(Agency $agency, int $index, array $definition, array $employers, CarbonImmutable $today, CarbonImmutable $now, array &$activeOrdinal): array
    {
        $pathway = $definition['pathway'];
        $roles = array_values(array_filter([...DemoJobPostSeeder::roles(), ...self::roles()], fn (array $role): bool => $role['pathway'] === $pathway));
        $poster = User::query()->where('email', 'recruiter@'.$agency->slug.'.example.test')->firstOrFail();
        $kinds = [...array_fill(0, $definition['active'], 'active'), 'closed', 'archived', 'expired'];
        $hiresPerPost = $this->distribute($definition['hired'], count($kinds));
        $posts = [];

        foreach ($kinds as $slot => $kind) {
            $role = $roles[($index * 3 + $slot) % count($roles)];
            $employer = $employers[$slot % count($employers)];
            $location = $employer->employer_location;
            $workLocation = $pathway === 'seabased' ? 'International waters; joining in '.$location : $location;
            [$currency, $rate] = $pathway === 'seabased' ? ['USD', 100] : self::destinations()[$location];
            $ordinal = $kind === 'active' ? $activeOrdinal[$pathway]++ : $index * 3 + $slot;
            // 7 is coprime with 40, so the rank spreads the newest posts across agencies.
            $rank = $kind === 'active' ? ($ordinal * 7) % 40 : $ordinal;
            $daysAgo = $kind !== 'active' ? 40 + ($ordinal * 7) % 50 : ($rank < 10 ? intdiv($rank * 2, 3) : 7 + (($rank - 10) * 5) % 68);
            $created = $now->subDays($daysAgo)->subHours($rank % 9)->subMinutes(($rank * 7 + $index) % 60);
            $created = $created->isAfter($now) ? $now : $created;
            $manpooling = $ordinal % 4 === 2;
            $minimum = intdiv($role['pay'] * $rate, 5000) * 50;
            [$salaryMin, $salaryMax] = match ($ordinal % 9) {
                7 => [null, null],
                8 => [$minimum, null],
                default => [$minimum, intdiv($minimum * 125, 100)],
            };

            $job = JobPost::query()->firstOrNew(['agency_id' => $agency->id, 'job_title' => $role['title'].' — '.$location]);
            $job->forceFill([
                'posted_by_user_id' => $poster->id, 'employer_id' => $employer->id,
                'recruitment_type' => $manpooling ? 'manpooling' : 'joborder',
                'job_order_number' => $manpooling ? null : sprintf('JO-%d-%d-%04d', $today->year, $agency->id, $slot + 1),
                'job_subcategory_id' => JobSubcategory::query()->where('subcategory_name', $role['subcategory'])
                    ->whereHas('category', fn ($query) => $query->where('pathway', $pathway))->firstOrFail()->id,
                'work_location' => $workLocation,
                'vacant_positions' => $hiresPerPost[$slot] + 2 + $slot % 5,
                'contract_type' => $pathway === 'seabased' || $slot % 3 !== 0 ? 'fixed' : 'permanent',
                'salary_currency' => $salaryMin === null ? null : $currency,
                'monthly_salary_min' => $salaryMin, 'monthly_salary_max' => $salaryMax,
                'education_level' => $role['education'], 'min_experience_years' => $role['experience'],
                'max_experience_years' => $slot % 2 === 0 ? $role['experience'] + 6 : null,
                'gender_requirement' => $slot % 7 === 3 ? 'female' : 'any',
                'job_description' => "## The assignment\nWork as a **{$role['title']}** in {$workLocation} with a partner of {$agency->agency_name}.\n\n## Duties\n{$role['duties']}\n\n## Benefits\n- Accommodation or housing allowance\n- Medical coverage and paid annual leave\n- Return airfare confirmed in the written contract",
                'other_requirements' => $slot % 2 === 0 ? 'Bring your **'.$role['certificate'].'** for verification.' : null,
                'application_instructions' => $slot % 3 === 1 ? 'Submit your resume through your account. Shortlisted applicants are contacted by the verified agency email.' : null,
                'contact_person_name' => $poster->name, 'contact_email' => $poster->email, 'contact_phone' => $agency->public_phone,
                'status' => match ($kind) {
                    'closed' => 'closed', 'archived' => 'archived', default => 'pending',
                },
                'closing_date' => match (true) {
                    $kind === 'expired' => $today->subDays(5 + $slot),
                    $kind !== 'active' => null,
                    default => match ($ordinal % 5) {
                        0, 3 => null,
                        1 => $today->addDays(1 + $ordinal % 3),
                        2 => $today->addDays(8 + $ordinal % 6),
                        default => $today->addDays(30 + $ordinal % 20),
                    },
                },
                'is_urgent' => $ordinal % 10 === 4,
                'created_at' => $created, 'updated_at' => $created,
            ])->save();

            DB::table('job_post_languages')->upsert([
                ['job_post_id' => $job->id, 'language' => 'english', 'proficiency' => 'fluent'],
                ...($slot % 2 === 0 ? [['job_post_id' => $job->id, 'language' => $pathway === 'seabased' ? 'tagalog' : 'arabic', 'proficiency' => 'basic']] : []),
            ], ['job_post_id', 'language'], ['proficiency']);

            $job->setAttribute('planned_hires', $hiresPerPost[$slot]);
            $posts[] = $job;
        }

        return $posts;
    }

    /**
     * @param  list<JobPost>  $posts
     * @param  list<User>  $applicants
     * @return list<array{job_post_id: int, applicant_user_id: int, stage: string, submitted_at: CarbonImmutable, actor: int}>
     */
    private function planApplications(array $posts, int $hired, int $agencyIndex, array $applicants, CarbonImmutable $now): array
    {
        $rows = [];

        foreach ($posts as $slot => $post) {
            $hires = (int) $post->getAttribute('planned_hires');
            $others = 3 + $slot % 3;
            $start = ($agencyIndex * 11 + $slot * 7) % self::APPLICANT_POOL_SIZE;

            for ($offset = 0; $offset < $hires + $others; $offset++) {
                $submitted = CarbonImmutable::parse($post->created_at)->addHours(2 + $offset % 5);
                $rows[] = [
                    'job_post_id' => $post->id,
                    'applicant_user_id' => $applicants[($start + $offset) % self::APPLICANT_POOL_SIZE]->id,
                    'stage' => $offset < $hires ? 'hired' : self::NON_HIRED_STAGES[($offset + $slot) % count(self::NON_HIRED_STAGES)],
                    'submitted_at' => $submitted->isAfter($now) ? $now : $submitted,
                    'actor' => $post->posted_by_user_id,
                ];
            }
        }

        return $rows;
    }

    /** @param list<array{job_post_id: int, applicant_user_id: int, stage: string, submitted_at: CarbonImmutable, actor: int}> $rows */
    private function seedApplications(array $rows, CarbonImmutable $now): void
    {
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('applications')->upsert(array_map(fn (array $row): array => [
                'job_post_id' => $row['job_post_id'], 'applicant_user_id' => $row['applicant_user_id'],
                'stage' => $row['stage'], 'submitted_at' => $row['submitted_at'],
                'cover_letter' => 'I would like to be considered for this position and can provide verified credentials on request.',
                'created_at' => $row['submitted_at'], 'updated_at' => $row['submitted_at'],
            ], $chunk), ['job_post_id', 'applicant_user_id'], ['stage', 'submitted_at', 'updated_at']);
        }

        $ids = Application::query()->whereIn('job_post_id', array_unique(array_column($rows, 'job_post_id')))
            ->get(['id', 'job_post_id', 'applicant_user_id'])
            ->mapWithKeys(fn (Application $application): array => [$application->job_post_id.':'.$application->applicant_user_id => $application->id]);
        $existing = DB::table('application_stage_history')->whereIn('application_id', $ids->values())
            ->get(['application_id', 'to_stage'])
            ->mapWithKeys(fn (object $history): array => [$history->application_id.':'.$history->to_stage => true]);
        $history = [];

        foreach ($rows as $row) {
            $applicationId = $ids[$row['job_post_id'].':'.$row['applicant_user_id']];
            $path = $row['stage'] === 'rejected' ? ['pending', 'reviewed', 'rejected']
                : array_slice(self::STAGE_PATH, 0, array_search($row['stage'], self::STAGE_PATH, true) + 1);

            foreach ($path as $step => $stage) {
                if (isset($existing[$applicationId.':'.$stage])) {
                    continue;
                }
                $at = $row['submitted_at']->addHours($step * 6);
                $history[] = [
                    'application_id' => $applicationId, 'from_stage' => $path[$step - 1] ?? null, 'to_stage' => $stage,
                    'changed_by_user_id' => $step === 0 ? null : $row['actor'],
                    'note' => $step === 0 ? 'Application submitted and awaiting initial review.' : 'Moved to '.$stage.' by the recruitment team.',
                    'created_at' => $at->isAfter($now) ? $now : $at,
                ];
            }
        }

        foreach (array_chunk($history, 300) as $chunk) {
            DB::table('application_stage_history')->insert($chunk);
        }
    }

    /** @param list<User> $applicants */
    private function seedReviews(Agency $agency, int $index, int $count, array $applicants, CarbonImmutable $today): void
    {
        $texts = [
            'The coordinator explained the document checklist clearly and answered my questions quickly.',
            'Salary and contract details were explained before I submitted my papers. Very organized.',
            'Updates were slow at times, but the staff eventually clarified each next step.',
            'Respectful staff and practical interview preparation. I would recommend them to friends.',
            'I had to follow up several times before anyone replied. Communication could be better.',
            'Clear written reminders and a named contact made the process much less confusing.',
        ];
        $ratings = [5, 4, 3, 5, 2, 4, 5, 1, 4, 5, 3, 4];

        for ($slot = 0; $slot < $count; $slot++) {
            $review = AgencyReview::query()->firstOrNew([
                'agency_id' => $agency->id,
                'applicant_user_id' => $applicants[($index * 7 + $slot) % self::APPLICANT_POOL_SIZE]->id,
            ]);
            $created = $today->subDays(3 + $slot * 5 + $index % 4)->setHour(11);
            $review->forceFill([
                'rating' => $ratings[($index + $slot) % count($ratings)],
                'review_text' => $texts[($index + $slot) % count($texts)],
                'deleted_at' => null, 'created_at' => $created, 'updated_at' => $created,
            ])->save();
        }
    }

    /**
     * Splits a number of hires across job posts so no post gets more than
     * its share; the remainder goes to the first posts.
     *
     * @return list<int>
     */
    private function distribute(int $total, int $buckets): array
    {
        return array_map(fn (int $bucket): int => intdiv($total, $buckets) + ($bucket < $total % $buckets ? 1 : 0), range(0, $buckets - 1));
    }

    private function printSummary(): void
    {
        $today = CarbonImmutable::now(config('app.timezone'))->toDateString();
        $public = Agency::query()->whereNull('suspended_at')->selectRaw('pathway, COUNT(*) AS total')->groupBy('pathway')->pluck('total', 'pathway');
        $active = JobPost::query()->active()->count();
        $notActive = JobPost::query()->count() - $active;
        $hired = DB::table('applications')->where('stage', 'hired')->count();
        $reviews = AgencyReview::query()->count();

        $this->command->info(sprintf('agencies (public): landbased %d, seabased %d', $public['landbased'] ?? 0, $public['seabased'] ?? 0));
        $this->command->info(sprintf('job_posts: %d active, %d not active (today %s)', $active, $notActive, $today));
        $this->command->info(sprintf('applications: %d hired', $hired));
        $this->command->info(sprintf('agency_reviews: %d', $reviews));
    }

    /** @return array<string, array{string, int}> Location => [currency, rate per 100 USD] */
    public static function destinations(): array
    {
        return [
            'Riyadh, Saudi Arabia' => ['SAR', 375], 'Dubai, United Arab Emirates' => ['AED', 367],
            'Doha, Qatar' => ['QAR', 364], 'Kuwait City, Kuwait' => ['KWD', 31],
            'Singapore, Singapore' => ['SGD', 135], 'Muscat, Oman' => ['USD', 100],
            'Manama, Bahrain' => ['USD', 100], 'Jeddah, Saudi Arabia' => ['SAR', 375],
            'Abu Dhabi, United Arab Emirates' => ['AED', 367],
        ];
    }

    /**
     * Agencies seeded by this class. `active` is the number of active job
     * posts (each agency also gets one closed, one archived and one expired
     * post), `hired` the hired applications spread across all of its posts.
     *
     * @return list<array{name: string, pathway: string, city: string, year: int, size: string, active: int, hired: int, reviews: int, hidden?: string}>
     */
    public static function agencies(): array
    {
        $landbased = [
            ['Kalinaw Overseas Staffing', 'Makati', 40, 6, 12], ['Bituin Workforce Partners', 'Pasig', 31, 5, 9],
            ['Lakbay Careers International', 'Quezon City', 24, 5, 8], ['Hiraya Global Manpower', 'Mandaluyong', 18, 4, 5],
            ['Sinag Talent Exchange', 'Cebu', 12, 4, 3], ['Tanglaw Recruitment Services', 'Davao', 7, 3, 2],
            ['Alon Bridge Placement', 'Iloilo', 5, 3, 1], ['Dakila Skilled Workers Agency', 'Taguig', 3, 3, 0],
            ['Liwayway Employment Hub', 'Baguio', 0, 2, 4], ['Marikit Placement Center', 'Bacolod', 0, 0, 0],
            ['Payapa Overseas Careers', 'Cagayan de Oro', 0, 0, 0], ['Masigla Manpower Solutions', 'Angeles', 2, 2, 6],
            ['Gabay Workforce International', 'Batangas', 1, 1, 2], ['Kislap Career Gateway', 'Lipa', 0, 1, 1],
        ];
        $seabased = [
            ['Dagat Meridian Crewing', 'Manila', 38, 5, 10], ['Habagat Marine Placement', 'Navotas', 29, 5, 8],
            ['Laot Bluewater Manning', 'Cavite', 21, 4, 8], ['Daungan Crew Services', 'Batangas', 15, 4, 4],
            ['Pantalan Seafarer Network', 'Subic', 10, 3, 3], ['Alimasag Maritime Careers', 'Iloilo', 6, 3, 2],
            ['Bangka Ocean Staffing', 'Cebu', 4, 3, 1], ['Kapitan Crew Partners', 'Tacloban', 3, 3, 0],
            ['Timon Shipboard Recruitment', 'General Santos', 0, 2, 5], ['Layag Bayan Manning', 'Zamboanga', 0, 2, 0],
            ['Agos Fleet Personnel', 'Dumaguete', 0, 2, 2], ['Pampang Marine Agency', 'Legazpi', 1, 0, 1],
            ['Hampas Alon Crewing', 'Ormoc', 2, 1, 3], ['Simoy Dagat Manpower', 'Roxas', 0, 1, 0],
        ];
        $sizes = ['Small team (10–20 staff)', '25 recruitment specialists', '40–60 staff', 'Boutique office with 8 staff', '100+ crewing and support staff'];
        $build = fn (array $row, string $pathway, int $offset): array => [
            'name' => $row[0], 'pathway' => $pathway, 'city' => $row[1], 'year' => 1992 + ($offset * 3) % 31,
            'size' => $sizes[$offset % count($sizes)], 'hired' => $row[2], 'active' => $row[3], 'reviews' => $row[4],
        ];

        return [
            ...array_map(fn (array $row, int $index): array => $build($row, 'landbased', $index), $landbased, array_keys($landbased)),
            ...array_map(fn (array $row, int $index): array => $build($row, 'seabased', $index + 14), $seabased, array_keys($seabased)),
            [...$build(['Sulong Paused Staffing', 'Makati', 45, 3, 4], 'landbased', 28), 'hidden' => 'suspended'],
            [...$build(['Unos Suspended Crewing', 'Manila', 60, 3, 4], 'seabased', 29), 'hidden' => 'suspended'],
            [...$build(['Lumang Archived Placement', 'Pasig', 9, 3, 4], 'landbased', 30), 'hidden' => 'deleted'],
        ];
    }

    /** @return array<string, array{pathway: string, title: string, subcategory: string, education: string, pay: int, experience: int, certificate: string, duties: string}> */
    public static function roles(): array
    {
        return [
            'machine-operator' => [
                'pathway' => 'landbased', 'title' => 'CNC Machine Operator', 'subcategory' => 'Machine Operator',
                'education' => 'vocational', 'pay' => 800, 'experience' => 2, 'certificate' => 'Machining NC II',
                'duties' => 'Set up and run CNC machines to approved drawings, check part dimensions and record production output for each shift.',
            ],
            'truck-driver' => [
                'pathway' => 'landbased', 'title' => 'Heavy Truck Driver', 'subcategory' => 'Truck Driver',
                'education' => 'secondary', 'pay' => 850, 'experience' => 3, 'certificate' => 'Professional Driver’s License (Code CE)',
                'duties' => 'Deliver goods safely on scheduled routes, complete pre-trip inspections and keep accurate delivery records.',
            ],
            'household-helper' => [
                'pathway' => 'landbased', 'title' => 'Household Service Worker', 'subcategory' => 'Household Helper',
                'education' => 'secondary', 'pay' => 500, 'experience' => 1, 'certificate' => 'Housekeeping NC II',
                'duties' => 'Keep the household clean and organized, prepare simple meals and support the family with daily routines.',
            ],
            'it-support' => [
                'pathway' => 'landbased', 'title' => 'IT Support Technician', 'subcategory' => 'IT Support Technician',
                'education' => 'bachelor', 'pay' => 1400, 'experience' => 2, 'certificate' => 'CompTIA A+ or equivalent',
                'duties' => 'Resolve hardware and software tickets, set up workstations and document fixes in the service desk system.',
            ],
            'roustabout' => [
                'pathway' => 'seabased', 'title' => 'Offshore Roustabout', 'subcategory' => 'Roustabout',
                'education' => 'secondary', 'pay' => 1600, 'experience' => 1, 'certificate' => 'BOSIET and STCW Basic Training',
                'duties' => 'Support deck and drilling crews with lifting operations, equipment cleaning and safe material handling offshore.',
            ],
            'storekeeper' => [
                'pathway' => 'seabased', 'title' => 'Ship Storekeeper', 'subcategory' => 'Storekeeper',
                'education' => 'secondary', 'pay' => 1500, 'experience' => 2, 'certificate' => 'STCW Basic Training',
                'duties' => 'Receive, record and issue ship stores, track inventory levels and prepare replenishment requests for the voyage.',
            ],
        ];
    }
}
