<?php

namespace App\Http\Requests\Dashboard;

use App\Support\Toast;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

abstract class JobPostFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge($this->normalize($this->all()));
    }

    /** @param array<array-key, mixed> $values
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

    protected function failedValidation(Validator $validator): void
    {
        Toast::error(__('Please fix the highlighted fields.'));
        parent::failedValidation($validator);
    }
}
