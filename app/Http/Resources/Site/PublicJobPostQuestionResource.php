<?php

namespace App\Http\Resources\Site;

use App\Http\Resources\Site\Concerns\CapsStrings;
use App\Models\JobPostQuestion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A question as the applicant sees it. The agency's expected answer is
 * never part of the payload; `answer` stays empty for the shared JobQuestion
 * shape.
 *
 * @mixin JobPostQuestion
 */
class PublicJobPostQuestionResource extends JsonResource
{
    use CapsStrings;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'label' => $this->cap($this->question_text, 255),
            'type' => $this->answer_type->value,
            'options' => $this->options ?? [],
            'answer' => '',
            'required' => $this->is_required,
        ];
    }
}
