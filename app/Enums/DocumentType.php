<?php

namespace App\Enums;

enum DocumentType: string
{
    case Resume = 'resume';
    case Certificate = 'certificate';
    case Passport = 'passport';
    case Other = 'other';
}
