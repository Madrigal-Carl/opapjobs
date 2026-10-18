<?php

namespace App\Http\Requests\Dashboard;

use App\Enums\JobPostDisplayStatus;
use App\Enums\JobPostSort;
use App\Enums\RecruitmentType;
use App\Support\JobPostIndexFilters;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class JobPostIndexRequest extends FormRequest
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
            'page' => ['sometimes', 'required', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'required', 'integer', Rule::in([10, 25, 50])],
            'q' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(JobPostDisplayStatus::class)],
            'recruitment_type' => ['nullable', Rule::enum(RecruitmentType::class)],
            'sort' => ['sometimes', 'required', Rule::enum(JobPostSort::class)],
        ];
    }

    protected function prepareForValidation(): void
    {
        $q = $this->input('q');

        if (is_string($q)) {
            $q = trim($q);
            $this->merge(['q' => $q === '' ? null : $q]);
        }
    }

    public function filters(): JobPostIndexFilters
    {
        /** @var array{q?: ?string, status?: ?string, recruitment_type?: ?string, sort?: string, per_page?: int|string, page?: int|string} $values */
        $values = $this->validated();

        return new JobPostIndexFilters(
            q: $values['q'] ?? null,
            status: isset($values['status']) ? JobPostDisplayStatus::from($values['status']) : null,
            recruitmentType: isset($values['recruitment_type']) ? RecruitmentType::from($values['recruitment_type']) : null,
            sort: JobPostSort::from($values['sort'] ?? JobPostSort::Newest->value),
            perPage: (int) ($values['per_page'] ?? 10),
            page: (int) ($values['page'] ?? 1),
        );
    }
}
