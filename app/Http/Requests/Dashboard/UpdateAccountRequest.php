<?php

namespace App\Http\Requests\Dashboard;

use App\Data\Account\UpdateAccountData;

class UpdateAccountRequest extends AccountFormRequest
{
    public function toDto(): UpdateAccountData
    {
        $data = $this->validated();

        return new UpdateAccountData(
            name: (string) $data['name'],
            email: (string) $data['email'],
            phone: $data['phone'] ?? null,
            notes: $data['notes'] ?? null,
            ipAddress: $this->ip() ?? '0.0.0.0',
        );
    }
}
