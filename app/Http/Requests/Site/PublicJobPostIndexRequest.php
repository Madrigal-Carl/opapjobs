<?php

namespace App\Http\Requests\Site;

use App\Http\Requests\Site\Concerns\NormalizesPublicQuery;
use App\Support\PublicJobPostFilters;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Query string of the public jobs page. `filters[]` holds the toggles; the
 * single `filter` parameter used by the site header links is accepted too.
 * Unknown values are dropped instead of rejected.
 */
class PublicJobPostIndexRequest extends FormRequest
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
            'q' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'filters' => ['present', 'array'],
            'filters.*' => ['string', Rule::in(PublicJobPostFilters::TOGGLES)],
            'page' => ['required', 'integer', 'min:1'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $requested = $this->query('filters');
        $requested = is_array($requested) ? $requested : [];
        $single = $this->query('filter');
        if (is_string($single)) {
            $requested[] = $single;
        }

        $toggles = array_values(array_filter(PublicJobPostFilters::TOGGLES, fn (string $toggle): bool => in_array($toggle, $requested, true)));

        // A job post has one pathway, so Landbased and Seabased exclude each other; the last one asked for wins.
        if (in_array('landbased', $toggles, true) && in_array('seabased', $toggles, true)) {
            $dropped = array_search('landbased', $requested, true) > array_search('seabased', $requested, true) ? 'seabased' : 'landbased';
            $toggles = array_values(array_diff($toggles, [$dropped]));
        }

        $this->merge([
            'q' => $this->keyword('q'),
            'country' => $this->keyword('country'),
            'filters' => $toggles,
            'page' => $this->pageNumber('page'),
        ]);
    }

    public function filters(): PublicJobPostFilters
    {
        /** @var array{q: ?string, country: ?string, filters: list<value-of<PublicJobPostFilters::TOGGLES>>, page: int} $values */
        $values = $this->validated();

        return new PublicJobPostFilters($values['q'], $values['country'], $values['filters'], (int) $values['page']);
    }
}
