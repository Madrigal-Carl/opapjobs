<?php

namespace App\Enums;

enum ApplicationStage: string
{
    case Applied = 'applied';
    case Reviewed = 'reviewed';
    case Interview = 'interview';
    case Hired = 'hired';
    case Pending = 'pending';
}
