<?php

namespace App\Enums;

enum Role: string
{
    case Applicant = 'applicant';
    case Employer = 'employer';
    case Admin = 'admin';
    case Superadmin = 'superadmin';
}
