<?php

namespace App\Http\Requests\Dashboard;

use App\Data\Employer\StoreEmployerData;
use Illuminate\Contracts\Validation\ValidationRule;

class StoreEmployerRequest extends JobPostFormRequest
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
            'employer_name' => ['required', 'string', 'max:255'],
            'employer_location' => ['required', 'string', 'max:255'],
            'employer_license_number' => ['required', 'string', 'max:255'],
        ];
    }

    public function toDto(): StoreEmployerData
    {
        /** @var array{employer_name: string, employer_location: string, employer_license_number: string} $data */
        $data = $this->validated();

        return new StoreEmployerData($data['employer_name'], $data['employer_location'], $data['employer_license_number']);
    }
}
