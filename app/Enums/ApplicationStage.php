<?php

namespace App\Enums;

use Illuminate\Support\Str;

enum ApplicationStage: string
{
    case Pending = 'pending';
    case Reviewed = 'reviewed';
    case Shortlisted = 'shortlisted';
    case ForInterview = 'for_interview';
    case Endorsed = 'endorsed';
    case NotSelected = 'not_selected';

    /** The name shown to people, e.g. "For Interview" or "Not Selected". */
    public function label(): string
    {
        return Str::headline($this->value);
    }

    /** Endorsed and Not Selected end the pipeline; nothing follows them. */
    public function isTerminal(): bool
    {
        return $this->next() === null;
    }

    /**
     * The stage a manual "Proceed" moves to. Pending skips Reviewed: that stage is only
     * reached automatically when an eligible staff member opens a pending application.
     */
    public function next(): ?self
    {
        return match ($this) {
            self::Pending => self::Shortlisted,
            self::Reviewed => self::Shortlisted,
            self::Shortlisted => self::ForInterview,
            self::ForInterview => self::Endorsed,
            self::Endorsed, self::NotSelected => null,
        };
    }
}
