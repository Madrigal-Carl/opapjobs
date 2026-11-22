<?php

namespace App\Http\Requests\Site;

use App\Enums\SkillLevel;
use App\Http\Requests\Site\Concerns\AuthorizesApplicant;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The whole profile, saved at once: every section list replaces what is
 * stored. Dates use the formats the profile page shows ("Mar 2021" for
 * roles, a year for schooling, ISO for certificates).
 */
class UpdateApplicantProfileRequest extends FormRequest
{
    use AuthorizesApplicant;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'headline' => ['nullable', 'string', 'max:200'],
            'phone' => ['nullable', 'string', 'max:60'],
            'location' => ['nullable', 'string', 'max:160'],
            'summary' => ['nullable', 'string', 'max:5000'],
            'is_visible' => ['required', 'boolean'],

            'experiences' => ['present', 'array', 'list', 'max:30'],
            'experiences.*' => ['array:role,company,start,end,location,description'],
            'experiences.*.role' => ['required', 'string', 'max:160'],
            'experiences.*.company' => ['required', 'string', 'max:160'],
            'experiences.*.start' => ['required', 'date_format:M Y'],
            'experiences.*.end' => ['nullable', 'date_format:M Y', 'after_or_equal:experiences.*.start'],
            'experiences.*.location' => ['nullable', 'string', 'max:160'],
            'experiences.*.description' => ['nullable', 'string', 'max:5000'],

            'education' => ['present', 'array', 'list', 'max:20'],
            'education.*' => ['array:school,degree,field,start,end'],
            'education.*.school' => ['required', 'string', 'max:160'],
            'education.*.degree' => ['required', 'string', 'max:160'],
            'education.*.field' => ['nullable', 'string', 'max:160'],
            'education.*.start' => ['required', 'digits:4', 'date_format:Y'],
            'education.*.end' => ['nullable', 'digits:4', 'date_format:Y', 'after_or_equal:education.*.start'],

            'certifications' => ['present', 'array', 'list', 'max:30'],
            'certifications.*' => ['array:name,issuer,issued_on,expires_on,credential_url'],
            'certifications.*.name' => ['required', 'string', 'max:160'],
            'certifications.*.issuer' => ['required', 'string', 'max:160'],
            'certifications.*.issued_on' => ['nullable', 'date_format:Y-m-d'],
            'certifications.*.expires_on' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:certifications.*.issued_on'],
            'certifications.*.credential_url' => ['nullable', 'url:http,https', 'max:500'],

            'skills' => ['present', 'array', 'list', 'max:50'],
            'skills.*' => ['array:name,level'],
            'skills.*.name' => ['required', 'string', 'max:120', 'distinct:ignore_case'],
            'skills.*.level' => ['required', Rule::enum(SkillLevel::class)],
        ];
    }

    /**
     * The page shows the first error as a toast, so each reads on its own.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => __('Enter your name.'),
            'experiences.*.start.date_format' => __('Enter when each role started as a month and year.'),
            'experiences.*.end.after_or_equal' => __('A role cannot end before it started.'),
            'education.*.start.digits' => __('Enter each school year as four digits.'),
            'education.*.end.after_or_equal' => __('A qualification cannot end before it started.'),
            'certifications.*.expires_on.after_or_equal' => __('A certificate cannot expire before it was issued.'),
            'certifications.*.credential_url.url' => __('Enter credential links as full web addresses starting with https://.'),
            'skills.*.name.distinct' => __('Each skill can be listed only once.'),
        ];
    }
}
