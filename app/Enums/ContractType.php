<?php

namespace App\Enums;

enum ContractType: string
{
    case Permanent = 'permanent';
    case Fixed = 'fixed';
    case Seasonal = 'seasonal';
}
