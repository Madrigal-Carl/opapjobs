<?php

namespace App\Http\Requests\Dashboard;

use App\Data\Account\StoreAccountData;

class StoreAccountRequest extends AccountFormRequest
{
    public function toDto(): StoreAccountData
    {
        $data = $this->validated();

        return new StoreAccountData(
            name: (string) $data['name'],
            email: (string) $data['email'],
            phone: $data['phone'] ?? null,
            notes: $data['notes'] ?? null,
            ipAddress: $this->ip() ?? '0.0.0.0',
        );
    }
}
