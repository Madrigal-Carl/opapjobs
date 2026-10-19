<?php

namespace App\Enums;

enum ApplicationStage: string
{
    case Pending = 'pending';
    case UnderReview = 'under_review';
    case Shortlisted = 'shortlisted';
    case Interviewed = 'interviewed';
    case Hired = 'hired';
}
