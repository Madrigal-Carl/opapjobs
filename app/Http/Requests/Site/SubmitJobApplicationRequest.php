<?php

namespace App\Http\Requests\Site;

use App\Enums\DocumentType;
use App\Enums\Permission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitJobApplicationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can(Permission::ViewAgencyProfile->value)
            && ! $this->user()->can(Permission::AccessDashboard->value);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'resume_document_id' => [
                'nullable', 'required_without:resume', Rule::prohibitedIf($this->hasFile('resume')), 'integer',
                Rule::exists('applicant_documents', 'id')->where(fn ($query) => $query
                    ->where('applicant_user_id', $this->user()->id)->where('document_type', DocumentType::Resume->value)->whereNull('deleted_at')),
            ],
            'resume' => ['nullable', 'required_without:resume_document_id', Rule::prohibitedIf($this->filled('resume_document_id')), 'file', 'mimes:pdf,docx', 'extensions:pdf,docx', 'max:10240'],
            'cover_letter' => ['nullable', 'string', 'max:20000'],
            'answers' => ['sometimes', 'array', 'max:20'],
            'answers.*' => ['nullable', 'string', 'max:10000'],
            'documents' => ['sometimes', 'array', 'list', 'max:20'],
            'documents.*' => ['array:name,file'],
            'documents.*.name' => ['required', 'string', 'max:255', 'distinct:strict'],
            'documents.*.file' => ['required', 'file', 'mimes:pdf', 'extensions:pdf', 'max:10240'],
        ];
    }
}
