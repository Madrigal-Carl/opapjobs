<?php

namespace App\Actions\Site;

use App\Models\Agency;
use App\Models\JobPost;
use App\Models\User;
use App\Services\Site\PublicJobPostService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ShowPublicJobPostAction
{
    public function __construct(private PublicJobPostService $posts) {}

    /** @return null|array{post: JobPost, agency: Agency, otherJobs: Collection<int, JobPost>, relatedJobs: Collection<int, JobPost>} */
    public function execute(string $id, ?User $viewer): ?array
    {
        return DB::transaction(fn (): ?array => $this->posts->show($id, $viewer?->id));
    }
}
