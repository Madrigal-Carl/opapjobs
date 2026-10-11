<?php

namespace App\Enums;

enum Permission: string
{
    case AccessDashboard = 'access dashboard';
    case ViewAgencyProfile = 'view agency profile';
}
