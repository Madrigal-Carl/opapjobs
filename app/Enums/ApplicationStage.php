<?php

namespace App\Enums;

enum ApplicationStage: string
{
    case Pending = 'pending';
    case Reviewed = 'reviewed';
    case Shortlisted = 'shortlisted';
    case Interviewed = 'interviewed';
    case Hired = 'hired';
}
