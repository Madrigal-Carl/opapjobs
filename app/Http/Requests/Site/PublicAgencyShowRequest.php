<?php

namespace App\Http\Requests\Site;

use App\Http\Requests\Site\Concerns\NormalizesPublicQuery;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/** The agency profile's review pagination (`reviews_page`), falling back to 1. */
class PublicAgencyShowRequest extends FormRequest
{
    use NormalizesPublicQuery;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return ['reviews_page' => ['required', 'integer', 'min:1']];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['reviews_page' => $this->pageNumber('reviews_page')]);
    }

    public function reviewsPage(): int
    {
        return (int) $this->validated('reviews_page');
    }
}
