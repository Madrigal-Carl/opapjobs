<?php

namespace App\Enums;

enum Permission: string
{
    case AccessDashboard = 'access dashboard';
    case ViewAgencyProfile = 'view agency profile';
    case ViewHiringOverview = 'view hiring overview';
    case ViewPlatformOverview = 'view platform overview';
    case ViewSystemOverview = 'view system overview';
    case ViewJobs = 'view jobs';
    case ViewApplications = 'view applications';
    case ViewCandidates = 'view candidates';
    case ViewAccounts = 'view accounts';
}
