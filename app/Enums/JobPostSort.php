<?php

namespace App\Enums;

enum JobPostSort: string
{
    case Newest = 'newest';
    case Oldest = 'oldest';
    case Expiring = 'expiring';
    case Applicants = 'applicants';
    case Salary = 'salary';
}
