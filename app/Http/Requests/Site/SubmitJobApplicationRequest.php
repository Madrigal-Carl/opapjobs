<?php

namespace App\Http\Requests\Site;

use App\Enums\Permission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

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
                $this->ownDocument(),
            ],
            'resume' => ['nullable', 'required_without:resume_document_id', Rule::prohibitedIf($this->filled('resume_document_id')), 'file', 'mimes:pdf,docx', 'extensions:pdf,docx', 'max:10240'],
            'cover_letter' => ['nullable', 'string', 'max:20000'],
            'answers' => ['sometimes', 'array', 'max:20'],
            'answers.*' => ['nullable', 'string', 'max:10000'],
            'documents' => ['sometimes', 'array', 'list', 'max:20'],
            'documents.*' => ['array:name,file,document_id'],
            'documents.*.name' => ['required', 'string', 'max:255', 'distinct:strict'],
            // Each required document is a new PDF or a PDF already on the profile, never both.
            'documents.*.file' => ['nullable', 'required_without:documents.*.document_id', 'prohibits:documents.*.document_id', 'file', 'mimes:pdf', 'extensions:pdf', 'max:10240'],
            'documents.*.document_id' => ['nullable', 'integer', $this->ownDocument(['application/pdf'])],
        ];
    }

    /**
     * A file on the applicant's own profile that has not been removed. Every
     * upload path only accepts PDF or DOCX, so a resume needs no type filter.
     *
     * @param  list<string>|null  $mimeTypes
     */
    private function ownDocument(?array $mimeTypes = null): Exists
    {
        return Rule::exists('applicant_documents', 'id')->where(fn ($query) => $query
            ->where('applicant_user_id', $this->user()->id)->whereNull('deleted_at')
            ->when($mimeTypes !== null, fn ($query) => $query->whereIn('mime_type', $mimeTypes)));
    }
}
