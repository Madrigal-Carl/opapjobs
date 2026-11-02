<?php

namespace App\Actions\Site;

use App\Models\Agency;
use App\Models\JobPost;
use App\Services\Site\PublicAgencyService;
use App\Services\Site\PublicJobPostService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ShowHomeAction
{
    public function __construct(private PublicAgencyService $agencies, private PublicJobPostService $posts) {}

    /**
     * @return array{
     *     agencies: array<string, Collection<int, Agency>>,
     *     topHirers: array<string, Collection<int, Agency>>,
     *     jobs: array<string, Collection<int, JobPost>>,
     *     stats: array{agencies: array{landbased: int, seabased: int}, topHirers: array<string, int>, jobs: array{landbased: int, seabased: int}}
     * }
     */
    public function execute(): array
    {
        return DB::transaction(function (): array {
            $agencies = $this->agencies->home();
            $posts = $this->posts->home();

            return [
                'agencies' => $agencies['agencies'], 'topHirers' => $agencies['topHirers'], 'jobs' => $posts['jobs'],
                'stats' => ['agencies' => $agencies['agencyCounts'], 'topHirers' => $agencies['topHirerCounts'], 'jobs' => $posts['activeCounts']],
            ];
        });
    }
}
