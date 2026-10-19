<?php

namespace App\Data\Employer;

readonly class StoreEmployerData
{
    public function __construct(public string $name, public string $location, public string $licenseNumber) {}
}
