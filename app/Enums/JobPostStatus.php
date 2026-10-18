<?php

namespace App\Enums;

enum JobPostStatus: string
{
    case Pending = 'pending';
    case Closed = 'closed';
    case Archived = 'archived';
}
