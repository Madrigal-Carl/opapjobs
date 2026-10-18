<?php

namespace App\Enums;

enum Availability: string
{
    case Immediately = 'immediately';
    case Within2Weeks = 'within_2_weeks';
    case Within1Month = 'within_1_month';
    case MoreThan1Month = 'more_than_1_month';
}
