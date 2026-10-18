<?php

namespace App\Enums;

enum QuestionAnswerType: string
{
    case Yesno = 'yesno';
    case Short = 'short';
    case Paragraph = 'paragraph';
}
