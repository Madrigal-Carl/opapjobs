<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Application;
use App\Models\ApplicationStageHistory;
use App\Models\JobPost;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoApplicationSeeder extends Seeder
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
            $curated = DemoApplicantSeeder::applicants();
            $applicants = User::role(Role::Applicant->value)->whereIn('email', array_column($curated, 'email'))->whereHas('applicantProfile')
                ->with(['applicantProfile', 'documents', 'experiences'])->get()->keyBy('email');
            $posts = JobPost::whereHas('agency', fn ($query) => $query->whereIn('slug', DemoAgencySeeder::SLUGS))
                ->with(['agency', 'questions' => fn ($query) => $query->withTrashed()->orderBy('sort_order'), 'subcategory.category'])
                ->orderBy('id')->get();
            $ordinal = 0;
            $archivedUsed = false;
            $answers = [];
            $hired = [];
            $agencyOrdinals = [];

            foreach ($curated as $index => $identity) {
                $applicant = $applicants->get($identity['email']) ?? throw new \LogicException('Seed the curated applicant profiles before their applications.');
                // Skip the two shared sign-in applicants so their dashboards start without applications.
                if ($index < 2) {
                    continue;
                }

                $occupation = $applicant->experiences->firstOrFail()->job_role;
                $candidates = $posts->filter(fn (JobPost $post): bool => str_starts_with($post->job_title, $occupation.' — ')
                    && $post->getRawOriginal('status') !== 'archived')->values();
                if (in_array($index, [8, 35], true)) {
                    $crossOver = $posts->first(fn (JobPost $post): bool => str_contains($post->job_title, 'Nurse')
                        && $post->agency->getRawOriginal('pathway') !== $applicant->applicantProfile->getRawOriginal('preferred_pathway')
                        && $post->getRawOriginal('status') !== 'archived');
                    if ($crossOver !== null) {
                        $candidates->prepend($crossOver);
                    }
                }
                if (! $archivedUsed) {
                    $archived = $posts->first(fn (JobPost $post): bool => $post->getRawOriginal('status') === 'archived'
                        && str_starts_with($post->job_title, $occupation.' — '));
                    if ($archived !== null) {
                        $candidates->prepend($archived);
                        $archivedUsed = true;
                    }
                }

                foreach ($candidates->take(3 + $index % 3) as $post) {
                    $submitted = CarbonImmutable::parse($post->created_at)->addDays(2 + $index % 3)->addHour();
                    // Count per agency so every agency's own slot walk covers all six stages.
                    $agencyOrdinal = $agencyOrdinals[$post->agency_id] ?? 0;
                    $agencyOrdinals[$post->agency_id] = $agencyOrdinal + 1;
                    $slot = ($agencyOrdinal * 37) % 100;
                    $stage = match (true) {
                        $slot < 25 => 'pending', $slot < 44 => 'reviewed', $slot < 59 => 'shortlisted',
                        $slot < 74 => 'interviewed', $slot < 82 => 'hired', default => 'rejected',
                    };
                    if ($stage === 'hired') {
                        if (($hired[$post->id] ?? 0) >= $post->vacant_positions) {
                            $stage = 'interviewed';
                        } else {
                            $hired[$post->id] = ($hired[$post->id] ?? 0) + 1;
                        }
                    }
                    $path = match ($stage) {
                        'pending' => ['pending'], 'reviewed' => ['pending', 'reviewed'],
                        'shortlisted' => ['pending', 'reviewed', 'shortlisted'],
                        'interviewed' => ['pending', 'reviewed', 'shortlisted', 'interviewed'],
                        'hired' => ['pending', 'reviewed', 'shortlisted', 'interviewed', 'hired'],
                        'rejected' => [
                            'pending', 'reviewed',
                            ...match (true) {
                                $ordinal % 3 === 0 => ['shortlisted', 'interviewed'],
                                $ordinal % 2 === 0 => ['shortlisted'],
                                default => [],
                            },
                            'rejected',
                        ],
                    };
                    $resume = $applicant->documents->firstOrFail(fn ($document): bool => $document->getRawOriginal('document_type') === 'resume' && $document->is_primary);
                    $salary = ((int) $post->getRawOriginal('monthly_salary_min') + (int) $post->getRawOriginal('monthly_salary_max')) / 2;
                    $application = Application::firstOrNew(['job_post_id' => $post->id, 'applicant_user_id' => $applicant->id]);
                    $application->forceFill([
                        'resume_document_id' => $resume->id,
                        'cover_letter' => 'I would like to apply for the '.$post->job_title.' position. My experience as a '.$occupation.' has developed the practical skills and safe working habits described in my resume. I am available to discuss the assignment, provide verified credentials and explain how I can contribute to the team. Thank you for considering my application.',
                        'expected_monthly_salary' => number_format($salary, 2, '.', ''),
                        'availability' => $applicant->applicantProfile->getRawOriginal('availability'), 'stage' => $stage,
                        'submitted_at' => $submitted, 'applicant_archived_at' => $ordinal % 17 === 0 ? $today->subDay()->setHour(17) : null,
                        'created_at' => $submitted, 'updated_at' => $submitted->addDays(count($path) - 1),
                    ])->save();

                    foreach ($path as $step => $toStage) {
                        $history = ApplicationStageHistory::firstOrNew(['application_id' => $application->id, 'to_stage' => $toStage]);
                        $history->forceFill([
                            'from_stage' => $path[$step - 1] ?? null,
                            'changed_by_user_id' => $step === 0 ? null : ($ordinal % 2 === 0 ? $post->posted_by_user_id : $post->agency->admin_user_id),
                            'note' => match ($toStage) {
                                'pending' => 'Application submitted and awaiting initial review.',
                                'reviewed' => 'Resume and screening responses checked against the job requirements.',
                                'shortlisted' => 'Candidate shortlisted for an interview with the recruitment team.',
                                'interviewed' => 'Candidate completed the interview with the recruitment coordinator.',
                                'hired' => 'Written offer accepted following the final selection interview.',
                                'rejected' => match ($ordinal % 3) {
                                    0 => 'Interview completed, but another candidate better matched the current requirements.',
                                    1 => 'Application closed after screening; the role needs credentials the candidate does not yet hold.',
                                    default => 'Candidate withdrew after review because the assignment dates no longer fit.',
                                },
                            },
                            'created_at' => $submitted->addDays($step),
                        ])->save();
                    }

                    foreach ($post->questions as $question) {
                        if (CarbonImmutable::parse($question->created_at)->isAfter($submitted)
                            || ($question->deleted_at !== null && CarbonImmutable::parse($question->deleted_at)->lessThanOrEqualTo($submitted))) {
                            continue;
                        }
                        if (! $question->is_required && ($index + $question->sort_order) % 5 === 0) {
                            continue;
                        }
                        $years = (int) CarbonImmutable::parse($applicant->experiences->min('started_on'))->diffInYears($submitted);
                        $answers[] = [
                            'application_id' => $application->id, 'job_post_question_id' => $question->id,
                            'answer_text' => match ($question->getRawOriginal('answer_type')) {
                                'yesno' => 'Yes', 'short' => $years.' years in comparable roles.',
                                'paragraph' => 'In my '.$occupation.' work, I prepare the work area, confirm the agreed procedure and complete the required safety checks before starting. I report any deviation to the supervisor, record the action taken and provide a clear handover so the next person understands the condition of the work.',
                                default => throw new \LogicException('Unsupported screening answer type.'),
                            },
                        ];
                    }
                    $ordinal++;
                }
            }

            foreach (array_chunk($answers, 100) as $chunk) {
                DB::table('application_answers')->upsert($chunk, ['application_id', 'job_post_question_id'], ['answer_text']);
            }
        });
    }
}
