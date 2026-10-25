<?php

namespace App\Data\Account;

readonly class UpdateAccountData
{
    public function __construct(
        public string $name,
        public string $email,
        public string $employeeId,
        public ?string $phone,
        public ?string $notes,
        public string $ipAddress,
    ) {}
}
