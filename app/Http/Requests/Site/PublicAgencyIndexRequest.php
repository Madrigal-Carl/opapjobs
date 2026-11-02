<?php

namespace App\Http\Requests\Site;

use App\Enums\Pathway;
use App\Http\Requests\Site\Concerns\NormalizesPublicQuery;
use App\Support\PublicAgencyFilters;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Query string of the public agency directory. Bad values fall back to the
 * defaults in `prepareForValidation`, so a mangled link still renders the
 * directory instead of a validation error.
 */
class PublicAgencyIndexRequest extends FormRequest
{
    use NormalizesPublicQuery;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'pathway' => ['required', Rule::enum(Pathway::class)],
            'q' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'page' => ['required', 'integer', 'min:1'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $pathway = $this->query('pathway');

        $this->merge([
            'pathway' => is_string($pathway) && Pathway::tryFrom($pathway) !== null ? $pathway : Pathway::Landbased->value,
            'q' => $this->keyword('q'),
            'country' => $this->keyword('country'),
            'page' => $this->pageNumber('page'),
        ]);
    }

    public function filters(): PublicAgencyFilters
    {
        /** @var array{pathway: string, q: ?string, country: ?string, page: int} $values */
        $values = $this->validated();

        return new PublicAgencyFilters(Pathway::from($values['pathway']), $values['q'], $values['country'], (int) $values['page']);
    }
}
