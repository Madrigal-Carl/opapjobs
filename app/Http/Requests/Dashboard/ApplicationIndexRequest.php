<?php

namespace App\Http\Requests\Dashboard;

use App\Enums\ApplicationSort;
use App\Enums\ApplicationStage;
use App\Support\ApplicationIndexFilters;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ApplicationIndexRequest extends FormRequest
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
            'stage' => ['nullable', Rule::enum(ApplicationStage::class)],
            'sort' => ['sometimes', 'required', Rule::enum(ApplicationSort::class)],
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

    public function filters(): ApplicationIndexFilters
    {
        /** @var array{q?: ?string, stage?: ?string, sort?: string, per_page?: int|string, page?: int|string} $values */
        $values = $this->validated();

        return new ApplicationIndexFilters(
            q: $values['q'] ?? null,
            stage: isset($values['stage']) ? ApplicationStage::from($values['stage']) : null,
            sort: ApplicationSort::from($values['sort'] ?? ApplicationSort::Newest->value),
            perPage: (int) ($values['per_page'] ?? 10),
            page: (int) ($values['page'] ?? 1),
        );
    }
}
