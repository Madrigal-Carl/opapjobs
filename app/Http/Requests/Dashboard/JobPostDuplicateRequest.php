<?php

namespace App\Http\Requests\Dashboard;

use App\Data\JobPost\JobPostDuplicateData;
use Illuminate\Contracts\Validation\ValidationRule;

class JobPostDuplicateRequest extends JobPostFormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'employer_id' => ['nullable', 'integer', 'min:1'],
            'job_title' => ['required', 'string', 'max:255'],
            'job_subcategory_id' => ['required', 'integer', 'min:1'],
        ];
    }

    public function toDto(): JobPostDuplicateData
    {
        return new JobPostDuplicateData($this->input('employer_id') === null ? null : $this->integer('employer_id'),
            $this->string('job_title')->toString(), $this->integer('job_subcategory_id'));
    }
}
