<?php

namespace App\Http\Resources\Site;

use App\Http\Resources\Site\Concerns\CapsStrings;
use App\Models\AgencyReview;
use App\Support\PublicDisplay;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One review as the public reads it: the reviewer's first name and last
 * initial only, never an email.
 *
 * @mixin AgencyReview
 */
class PublicAgencyReviewResource extends JsonResource
{
    use CapsStrings;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reviewer' => PublicDisplay::reviewerName($this->applicant->name ?? ''),
            'rating' => $this->rating,
            'comment' => $this->cap($this->review_text, 3000) ?? '',
            'date' => $this->created_at?->format('F Y'),
        ];
    }
}
