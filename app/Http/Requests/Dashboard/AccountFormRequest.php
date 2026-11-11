<?php

namespace App\Http\Requests\Dashboard;

use App\Support\Toast;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared rules for adding and editing a staff account. The messages mirror
 * the client-side zod schema in resources/js/data/staff-account-form.ts so a
 * field reads the same whether the browser or the server rejects it.
 */
abstract class AccountFormRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32', 'regex:/^\+?[0-9\s().-]{7,32}$/'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => __('Enter the staff member’s full name.'),
            'name.max' => __('Keep the name to 255 characters or fewer.'),
            'email.required' => __('Enter a work email.'),
            'email.email' => __('Enter a valid email address.'),
            'email.max' => __('Keep the email to 255 characters or fewer.'),
            'phone' => __('Enter a valid mobile number.'),
            'notes.max' => __('Keep notes to 1,000 characters or fewer.'),
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        Toast::error(__('Please fix the highlighted fields.'));
        parent::failedValidation($validator);
    }
}
