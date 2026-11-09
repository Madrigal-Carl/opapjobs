<?php

namespace App\Enums;

enum QuestionAnswerType: string
{
    case Yesno = 'yesno';
    case Short = 'short';
    case Selection = 'selection';
    case Number = 'number';
    case Paragraph = 'paragraph';
}
