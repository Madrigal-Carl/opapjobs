<?php

namespace App\Http\Requests\Dashboard;

use App\Support\AccountIndexFilters;
use Illuminate\Foundation\Http\FormRequest;

class AccountIndexRequest extends FormRequest
{
    public function getRedirectUrl(): string
    {
        return route('dashboard.accounts');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:active,suspended'],
            'per_page' => ['nullable', 'integer', 'in:10,25,50'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function filters(): AccountIndexFilters
    {
        return AccountIndexFilters::fromRequest($this);
    }
}
