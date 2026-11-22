<?php

namespace App\Http\Requests\Site;

use App\Http\Requests\Site\Concerns\AuthorizesApplicant;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * One or more files added to the profile at once. The same types the
 * apply wizard accepts, so every profile file can be sent with an
 * application.
 */
class StoreApplicantDocumentsRequest extends FormRequest
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
            'documents' => ['required', 'array', 'list', 'min:1', 'max:10'],
            'documents.*' => ['required', 'file', 'mimes:pdf,docx', 'extensions:pdf,docx', 'max:10240'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'documents.*.mimes' => __('Choose PDF or DOCX files only.'),
            'documents.*.extensions' => __('Choose PDF or DOCX files only.'),
            'documents.*.max' => __('Each file must be 10 MB or smaller.'),
        ];
    }
}
