// MOCK DATA: the apply wizard keeps its draft in localStorage so three steps
// of typing survive an accidental refresh or a closed tab. Keyed by job id,
// because a draft for one listing must never leak into another.
import type { ApplicationDraft } from '@/types/application-draft';

const STORAGE_PREFIX = 'opap-application-draft:';

function storageKey(jobId: string): string {
    return `${STORAGE_PREFIX}${jobId}`;
}

export function emptyApplicationDraft(): ApplicationDraft {
    return {
        resumeId: null,
        uploadedResume: null,
        coverLetter: '',
        salary: '',
        availability: '',
        answers: {},
    };
}

/**
 * Whether a stored value still looks like a draft. Older builds, or a
 * half-written entry, must not be handed to the form as if they were valid.
 */
function isDraft(value: unknown): value is ApplicationDraft {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const draft = value as Partial<ApplicationDraft>;

    return (
        typeof draft.coverLetter === 'string' &&
        typeof draft.salary === 'string' &&
        typeof draft.availability === 'string' &&
        (draft.answers === undefined ||
            (typeof draft.answers === 'object' && draft.answers !== null))
    );
}

/** The stored draft for a listing, or `null` when there is nothing usable. */
export function loadApplicationDraft(jobId: string): ApplicationDraft | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(storageKey(jobId));

        if (!raw) {
            return null;
        }

        const parsed: unknown = JSON.parse(raw);

        if (!isDraft(parsed)) {
            return null;
        }

        return { ...emptyApplicationDraft(), ...parsed };
    } catch {
        return null;
    }
}

export function saveApplicationDraft(
    jobId: string,
    draft: ApplicationDraft,
): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(storageKey(jobId), JSON.stringify(draft));
    } catch {
        // The in-memory draft still works when storage is unavailable.
    }
}

export function clearApplicationDraft(jobId: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.removeItem(storageKey(jobId));
    } catch {
        // Nothing to do: a draft that cannot be cleared is overwritten next run.
    }
}

/** How much the applicant has actually filled in, for the restore notice. */
export function draftProgress(draft: ApplicationDraft): number {
    const filled = [
        draft.resumeId ?? draft.uploadedResume,
        draft.coverLetter.trim(),
        draft.salary.trim(),
        draft.availability,
        Object.keys(draft.answers).length,
    ].filter(Boolean).length;

    return filled;
}
