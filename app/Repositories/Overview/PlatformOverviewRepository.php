<?php

namespace App\Repositories\Overview;

use App\Enums\ApplicationStage;
use App\Enums\JobPostDisplayStatus;
use App\Models\Application;
use App\Models\ApplicationStageHistory;
use App\Models\JobPost;
use App\Models\User;

/**
 * The aggregate numbers behind the admin's Platform overview.
 *
 * Every query runs through `visibleTo()`, the same scope the Jobs and
 * Applications screens use, so the overview can never disagree with the
 * lists behind it — an admin who sees 16 job posts on Jobs sees 16 here.
 * Per the spec (§2.2) an admin sees all job posts and applications of
 * their own Agency; `visibleTo()` resolves exactly that.
 */
class PlatformOverviewRepository
{
    /**
     * Headline totals plus the per-stage split the funnel and KPI cards
     * are built from.
     *
     * @return array{
     *     total_jobs: int,
     *     active_jobs: int,
     *     total_applications: int,
     *     stage_counts: array<string, int>,
     *     conversion_rate: int
     * }
     */
    public function summary(User $user): array
    {
        $status = JobPost::displayStatusExpression();

        $jobs = JobPost::query()->visibleTo($user)->toBase()
            ->selectRaw('COUNT(*) AS total_jobs')
            ->selectRaw(
                "SUM(CASE WHEN ({$status['sql']}) = ? THEN 1 ELSE 0 END) AS active_jobs",
                [...$status['bindings'], JobPostDisplayStatus::Active->value],
            )
            ->first();

        // Grouped rather than six conditional sums: one pass over the
        // table, and the shape is driven by the enum so a stage added
        // later cannot silently report under a stale key.
        $stageRows = Application::query()->visibleTo($user)->toBase()
            ->selectRaw('stage, COUNT(*) AS total')
            ->groupBy('stage')
            ->get();

        $stageCounts = [];

        foreach (ApplicationStage::cases() as $stage) {
            $stageCounts[$stage->label()] = 0;
        }

        foreach ($stageRows as $row) {
            $key = ApplicationStage::tryFrom((string) $row->stage)?->label();

            if ($key !== null) {
                $stageCounts[$key] = (int) $row->total;
            }
        }

        $totalApplications = array_sum($stageCounts);

        return [
            'total_jobs' => (int) ($jobs->total_jobs ?? 0),
            'active_jobs' => (int) ($jobs->active_jobs ?? 0),
            'total_applications' => $totalApplications,
            'stage_counts' => $stageCounts,
            'conversion_rate' => $totalApplications > 0
                ? (int) round(($stageCounts['Endorsed'] / $totalApplications) * 100)
                : 0,
        ];
    }

    /**
     * One point per day that had activity, ordered oldest first. Days with
     * no traffic are omitted here and filled in by the client for the
     * selected range, which keeps the payload proportional to real
     * activity rather than to calendar length.
     *
     * @return list<array{date: string, applications: int, reviewed: int, interview: int, hired: int}>
     */
    public function days(User $user): array
    {
        $applicationRows = Application::query()->visibleTo($user)->toBase()
            ->selectRaw('DATE(submitted_at) AS day, COUNT(*) AS applications')
            ->groupByRaw('DATE(submitted_at)')
            ->orderBy('day')
            ->get();

        // Reviewed/interviewed/hired are dated by the day the stage was
        // reached, not the day the application arrived — the history
        // table is the only place that records it.
        $historyRows = ApplicationStageHistory::query()
            ->whereIn('application_id', Application::query()->visibleTo($user)->select('applications.id'))
            ->toBase()
            ->selectRaw('DATE(created_at) AS day, to_stage, COUNT(*) AS total')
            ->groupByRaw('DATE(created_at), to_stage')
            ->get();

        $byDate = [];

        foreach ($applicationRows as $row) {
            $byDate[(string) $row->day] = [
                'date' => (string) $row->day,
                'applications' => (int) $row->applications,
                'reviewed' => 0,
                'interview' => 0,
                'hired' => 0,
            ];
        }

        foreach ($historyRows as $row) {
            $date = (string) $row->day;

            $key = match ((string) $row->to_stage) {
                ApplicationStage::Reviewed->value => 'reviewed',
                ApplicationStage::ForInterview->value => 'interview',
                ApplicationStage::Endorsed->value => 'hired',
                default => null,
            };

            if ($key === null) {
                continue;
            }

            if (! isset($byDate[$date])) {
                $byDate[$date] = [
                    'date' => $date,
                    'applications' => 0,
                    'reviewed' => 0,
                    'interview' => 0,
                    'hired' => 0,
                ];
            }

            $byDate[$date][$key] += (int) $row->total;
        }

        ksort($byDate);

        return array_values($byDate);
    }

    /**
     * The job posts drawing the most applications in scope.
     *
     * @return list<array{id: int, title: string, applicants: int}>
     */
    public function topJobs(User $user, int $limit): array
    {
        $rows = Application::query()->visibleTo($user)->toBase()
            ->selectRaw('job_post_id, COUNT(*) AS applicants')
            ->groupBy('job_post_id')
            ->orderByDesc('applicants')
            ->orderBy('job_post_id')
            ->limit($limit)
            ->get();

        if ($rows->isEmpty()) {
            return [];
        }

        $titles = JobPost::query()
            ->whereIn('id', $rows->pluck('job_post_id'))
            ->pluck('job_title', 'id');

        $results = [];

        foreach ($rows as $row) {
            $id = (int) $row->job_post_id;
            $title = $titles->get($id);

            if (! is_string($title)) {
                continue;
            }

            $results[] = [
                'id' => $id,
                'title' => $title,
                'applicants' => (int) $row->applicants,
            ];
        }

        return $results;
    }

    /**
     * The span the reporting period defaults to. Deriving it from the data
     * rather than hard-coding a window means the chart is never blank on
     * first load, whatever date the newest application carries.
     *
     * @return array{start: string, end: string}|null
     */
    public function dateRange(User $user): ?array
    {
        $row = Application::query()->visibleTo($user)->toBase()
            ->selectRaw('MIN(submitted_at) AS start_at, MAX(submitted_at) AS end_at')
            ->first();

        if ($row === null || $row->start_at === null || $row->end_at === null) {
            return null;
        }

        return [
            'start' => substr((string) $row->start_at, 0, 10),
            'end' => substr((string) $row->end_at, 0, 10),
        ];
    }
}
