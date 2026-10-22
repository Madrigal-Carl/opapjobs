<?php

namespace App\Http\Requests\Dashboard;

use App\Data\JobPost\StoreJobPostData;
use App\Enums\ContractType;
use App\Enums\Currency;
use App\Enums\EducationLevel;
use App\Enums\GenderRequirement;
use App\Enums\Language;
use App\Enums\LanguageProficiency;
use App\Enums\QuestionAnswerType;
use App\Enums\RecruitmentType;
use App\Rules\PlainJobPostText;
use App\Support\Toast;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * @phpstan-import-type Attributes from StoreJobPostData
 * @phpstan-import-type LanguageData from StoreJobPostData
 * @phpstan-import-type QuestionData from StoreJobPostData
 */
abstract class JobPostFormRequest extends FormRequest
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
            'recruitment_type' => ['required', Rule::enum(RecruitmentType::class)],
            // Only a "with job order" posting carries one; the form hides the
            // field for manpooling, so requiring it conditionally keeps the
            // two recruitment types honest.
            'job_order_number' => [
                'nullable', 'string', 'max:255',
                Rule::requiredIf(
                    fn (): bool => $this->input('recruitment_type') === RecruitmentType::Joborder->value
                ),
            ],
            'required_documents' => ['sometimes', 'array', 'list', 'max:20'],
            'required_documents.*' => ['required', 'string', 'max:255'],
            'employer_id' => ['nullable', 'integer', 'min:1'],
            'job_title' => ['required', 'string', 'max:255'],
            'job_subcategory_id' => ['required', 'integer', 'min:1'],
            'work_location' => ['required', 'string', 'max:255'],
            'vacant_positions' => ['required', 'integer', 'between:1,65535'],
            'contract_type' => ['required', Rule::enum(ContractType::class)],
            'salary_currency' => ['nullable', 'required_with:monthly_salary_min,monthly_salary_max', Rule::enum(Currency::class)],
            'monthly_salary_min' => ['nullable', 'numeric', 'decimal:0,2', 'between:0,9999999999.99'],
            'monthly_salary_max' => ['nullable', 'numeric', 'decimal:0,2', 'between:0,9999999999.99'],
            'education_level' => ['required', Rule::enum(EducationLevel::class)],
            'min_experience_years' => ['nullable', 'integer', 'between:0,255'],
            'max_experience_years' => ['nullable', 'integer', 'between:0,255'],
            'gender_requirement' => ['required', Rule::enum(GenderRequirement::class)],
            'job_description' => ['required', 'string', 'max:20000', new PlainJobPostText],
            'other_requirements' => ['nullable', 'string', 'max:20000', new PlainJobPostText],
            'application_instructions' => ['nullable', 'string', 'max:20000', new PlainJobPostText],
            'contact_person_name' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email:rfc', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:255'],
            'closing_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:'.now(config('app.timezone'))->toDateString()],
            'is_urgent' => ['sometimes', 'boolean'],
            'languages' => ['sometimes', 'array', 'list', 'max:10'],
            'languages.*' => ['array:language,proficiency'],
            'languages.*.language' => ['required', Rule::enum(Language::class), 'distinct:strict'],
            'languages.*.proficiency' => ['required', Rule::enum(LanguageProficiency::class)],
            'questions' => ['sometimes', 'array', 'list', 'max:20'],
            'questions.*' => ['array'],
            'questions.*.id' => ['prohibited'],
            'questions.*.question_text' => ['required', 'string', 'max:255'],
            'questions.*.answer_type' => ['required', Rule::enum(QuestionAnswerType::class)],
            'questions.*.expected_answer' => ['nullable', 'string', 'max:2000'],
            'questions.*.is_required' => ['sometimes', 'boolean'],
        ];
    }

    /** @return list<\Closure(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach ([['monthly_salary_min', 'monthly_salary_max'], ['min_experience_years', 'max_experience_years']] as [$min, $max]) {
                if (! $validator->errors()->hasAny([$min, $max]) && $this->input($min) !== null && $this->input($max) !== null
                    && $this->input($max) < $this->input($min)) {
                    $validator->errors()->add($max, __('The maximum must be at least the minimum.'));
                }
            }

            $questions = $this->input('questions', []);
            if (! is_array($questions)) {
                return;
            }
            $seen = [];
            foreach ($questions as $index => $question) {
                if (! is_array($question)) {
                    continue;
                }
                $text = $question['question_text'] ?? null;
                if (is_string($text)) {
                    $normalized = mb_strtolower($text);
                    if (in_array($normalized, $seen, true)) {
                        $validator->errors()->add("questions.{$index}.question_text", __('This question is already included.'));
                    }
                    $seen[] = $normalized;
                }
                if (($question['answer_type'] ?? null) === 'yesno' && ($question['expected_answer'] ?? null) !== null
                    && ! in_array($question['expected_answer'], ['yes', 'no'], true)) {
                    $validator->errors()->add("questions.{$index}.expected_answer", __('Choose Yes, No, or no preference.'));
                }
            }
        }];
    }

    protected function jobPostData(): StoreJobPostData
    {
        /** @var Attributes $attributes */
        $attributes = $this->safe()->except(['languages', 'questions']);
        foreach (['employer_id', 'salary_currency', 'monthly_salary_min', 'monthly_salary_max', 'min_experience_years', 'max_experience_years',
            'other_requirements', 'application_instructions', 'contact_person_name', 'contact_email', 'contact_phone', 'closing_date', 'job_order_number'] as $field) {
            $attributes[$field] ??= null;
        }
        foreach (['employer_id', 'job_subcategory_id', 'vacant_positions', 'min_experience_years', 'max_experience_years'] as $field) {
            if ($attributes[$field] !== null) {
                $attributes[$field] = (int) $attributes[$field];
            }
        }
        $attributes['is_urgent'] = $this->boolean('is_urgent');

        // A job order number belongs to a "with job order" posting only. The
        // form clears it when the toggle moves to manpooling, but a stale
        // value must never survive a round trip that flipped the toggle.
        if ($attributes['recruitment_type'] !== RecruitmentType::Joborder->value) {
            $attributes['job_order_number'] = null;
        }

        $documents = $this->validated('required_documents', []);
        $attributes['required_documents'] = array_values(array_unique(array_filter(array_map(
            fn (mixed $document): string => is_string($document) ? trim($document) : '',
            is_array($documents) ? $documents : [],
        ))));

        /** @var list<LanguageData> $languages */
        $languages = $this->validated('languages', []);
        /** @var list<array{id?: int, question_text: string, answer_type: string, expected_answer?: ?string, is_required?: bool}> $questions */
        $questions = $this->validated('questions', []);

        return new StoreJobPostData($attributes, $languages, array_map(fn (array $question): array => [
            ...(isset($question['id']) ? ['id' => (int) $question['id']] : []),
            'question_text' => $question['question_text'], 'answer_type' => $question['answer_type'],
            'expected_answer' => $question['expected_answer'] ?? null, 'is_required' => (bool) ($question['is_required'] ?? false),
        ], $questions), $this->ip() ?? '0.0.0.0');
    }

    protected function prepareForValidation(): void
    {
        $this->merge($this->normalize($this->all()));
    }

    /**
     * @param  array<array-key, mixed>  $values
     * @return array<array-key, mixed>
     */
    private function normalize(array $values): array
    {
        foreach ($values as $key => $value) {
            if (is_array($value)) {
                $values[$key] = $this->normalize($value);
            } elseif (is_string($value)) {
                $values[$key] = trim($value) === '' ? null : trim($value);
            }
        }

        return $values;
    }

    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator): void
    {
        Toast::error(__('Please fix the highlighted fields.'));
        parent::failedValidation($validator);
    }
}
