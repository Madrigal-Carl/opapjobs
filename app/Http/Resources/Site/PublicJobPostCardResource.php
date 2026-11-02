<?php

namespace App\Http\Resources\Site;

use App\Enums\RecruitmentType;
use App\Http\Resources\Site\Concerns\CapsStrings;
use App\Models\JobPost;
use App\Support\PublicAgencyRules;
use App\Support\PublicDisplay;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A job post card. Manpooling redaction happens here, on the server: the
 * employer is never put in the payload and the location is reduced to the
 * destination country (docs/database.md §8.2).
 *
 * @mixin JobPost
 */
class PublicJobPostCardResource extends JsonResource
{
    use CapsStrings;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $now = now();

        return [
            'id' => (string) $this->id,
            'title' => $this->cap($this->job_title, 200),
            'agency' => $this->cap($this->agency?->agency_name, 160),
            'agencySlug' => $this->agency?->slug,
            'pathway' => $this->agency?->pathway->value,
            'location' => $this->cap($this->publicLocation(), 200),
            'salary' => PublicDisplay::salary($this->salary_currency?->value, $this->monthly_salary_min, $this->monthly_salary_max),
            'postedAt' => $this->created_at?->toISOString(),
            'posted' => $this->created_at === null ? '' : PublicDisplay::postedLabel($this->created_at, $now),
            'postingType' => $this->recruitment_type->value,
            'employerHidden' => $this->isManpooling(),
            'employer' => $this->isManpooling() ? null : $this->cap($this->employer?->employer_name, 160),
            'urgent' => $this->is_urgent,
            'recent' => $this->created_at !== null && $this->created_at->greaterThanOrEqualTo($now->copy()->subDays(PublicAgencyRules::RECENT_DAYS)),
            'category' => $this->cap($this->subcategory?->category?->category_name, 120),
            'subCategory' => $this->cap($this->subcategory?->subcategory_name, 120),
            'closingDate' => $this->closing_date?->toDateString(),
            'vacantPositions' => $this->vacant_positions,
        ];
    }

    protected function isManpooling(): bool
    {
        return $this->recruitment_type === RecruitmentType::Manpooling;
    }

    protected function publicLocation(): string
    {
        return $this->isManpooling() ? PublicDisplay::destination($this->work_location) : $this->work_location;
    }
}
