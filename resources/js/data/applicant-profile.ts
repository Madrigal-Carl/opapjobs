import {
    RESUME_COMPLETENESS_FIELDS,
    type ApplicantProfile,
    type SkillLevel,
} from '@/types/applicant-profile';

/**
 * How much of the resume is filled in, as a percentage. Each section counts
 * once no matter how many entries it holds, so one long history cannot stand
 * in for a missing section.
 */
export function resumeCompleteness(profile: ApplicantProfile): number {
    const filled = RESUME_COMPLETENESS_FIELDS.filter((field) => {
        const value = profile[field];

        if (typeof value === 'string') {
            return value.trim().length > 0;
        }

        return value.length > 0;
    }).length;

    return Math.round((filled / RESUME_COMPLETENESS_FIELDS.length) * 100);
}

export function formatToday(): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date());
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function newEntryId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : String(Date.now());
}

export function countLabel(count: number, singular: string): string {
    return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

export function skillLevelDots(level: SkillLevel): number {
    return { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 }[level];
}
