<?php

namespace App\Enums;

enum ApplicationStage: string
{
    case Pending = 'pending';
    case Reviewed = 'reviewed';
    case Shortlisted = 'shortlisted';
    case Interviewed = 'interviewed';
    case Hired = 'hired';
    case Rejected = 'rejected';

    /** Hired and Rejected end the pipeline; nothing follows them. */
    public function isTerminal(): bool
    {
        return $this->next() === null;
    }

    public function next(): ?self
    {
        return match ($this) {
            self::Pending => self::Reviewed,
            self::Reviewed => self::Shortlisted,
            self::Shortlisted => self::Interviewed,
            self::Interviewed => self::Hired,
            self::Hired, self::Rejected => null,
        };
    }
}
