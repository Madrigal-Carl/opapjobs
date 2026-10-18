<?php

namespace App\Enums;

enum JobPostDisplayStatus: string
{
    case Active = 'active';
    case Expired = 'expired';
    case Closed = 'closed';
    case Archived = 'archived';
}
