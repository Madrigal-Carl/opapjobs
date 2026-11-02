<?php

namespace App\Http\Resources\Site;

use App\Enums\JobPostDisplayStatus;
use App\Models\JobPost;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

/**
 * A row on My Jobs: the public card plus whether the job post still takes
 * applications, and the applicant's own application stage or saved date.
 *
 * @mixin JobPost
 */
class ApplicantJobPostResource extends PublicJobPostCardResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $stage = $this->getAttribute('application_stage');
        $appliedAt = $this->getAttribute('application_submitted_at');
        $savedAt = $this->getAttribute('saved_at');

        return [
            ...parent::toArray($request),
            'displayStatus' => $this->display_status->value,
            'isAcceptingApplications' => $this->display_status === JobPostDisplayStatus::Active,
            'applicationStage' => is_string($stage) ? $stage : null,
            'appliedAt' => $appliedAt === null ? null : CarbonImmutable::parse($appliedAt)->toISOString(),
            'savedAt' => $savedAt === null ? null : CarbonImmutable::parse($savedAt)->toISOString(),
        ];
    }
}
