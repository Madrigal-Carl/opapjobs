<?php

namespace App\Enums;

enum Role: string
{
    case Applicant = 'applicant';
    case Agency = 'agency';
    case Admin = 'admin';
    case Superadmin = 'superadmin';
}
