<?php

namespace App\Actions\Site;

use App\Models\JobPost;
use App\Services\Site\PublicJobPostService;
use App\Support\PublicJobPostFilters;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ListPublicJobPostsAction
{
    public function __construct(private PublicJobPostService $posts) {}

    /** @return array{posts: LengthAwarePaginator<int, JobPost>} */
    public function execute(PublicJobPostFilters $filters): array
    {
        return DB::transaction(fn (): array => $this->posts->browse($filters));
    }
}
