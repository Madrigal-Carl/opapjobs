<?php

namespace App\Http\Requests\Dashboard;

use App\Data\Account\StoreAccountData;
use App\Support\Toast;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreAccountRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'employee_id' => ['required', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:32', 'regex:/^\+?[0-9\s().-]{7,32}$/'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['employee_id' => 'employee ID'];
    }

    public function toDto(): StoreAccountData
    {
        $data = $this->validated();

        return new StoreAccountData(
            name: (string) $data['name'],
            email: (string) $data['email'],
            employeeId: (string) $data['employee_id'],
            phone: $data['phone'] ?? null,
            notes: $data['notes'] ?? null,
            ipAddress: $this->ip() ?? '0.0.0.0',
        );
    }

    protected function failedValidation(Validator $validator): void
    {
        Toast::error(__('Please fix the highlighted fields.'));
        parent::failedValidation($validator);
    }
}
