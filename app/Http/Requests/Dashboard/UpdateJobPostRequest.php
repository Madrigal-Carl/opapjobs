<?php

namespace App\Http\Requests\Dashboard;

use App\Data\JobPost\UpdateJobPostData;
use App\Enums\JobPostStatus;
use App\Models\JobPost;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

class UpdateJobPostRequest extends JobPostFormRequest
{
    public function authorize(): bool
    {
        $post = JobPost::query()->visibleTo($this->user())->whereKey($this->route('jobPost'))->firstOrFail();

        return $post->status !== JobPostStatus::Archived;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'questions.*.id' => ['sometimes', 'integer', 'min:1', 'distinct', Rule::exists('job_post_questions', 'id')
                ->where('job_post_id', $this->route('jobPost'))->whereNull('deleted_at')],
        ];
    }

    public function toDto(): UpdateJobPostData
    {
        $data = $this->jobPostData();

        return new UpdateJobPostData($data->attributes, $data->languages, $data->questions, $data->ipAddress);
    }
}
