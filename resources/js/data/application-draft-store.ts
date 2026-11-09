import type {
    ApplicationDraft,
    ApplicationStep,
} from '@/types/application-draft';

/**
 * Where each wizard step keeps its answers while the applicant is filling
 * them in. A step is only written once it has been visited, so returning to
 * step 1 never blanks out step 2.
 */
export type ApplicationDraftRecord = ApplicationDraft & {
    /** Highest step the applicant has actually opened. */
    furthestStep: ApplicationStep;
    /** ISO timestamp of the last write, shown as "saved a moment ago". */
    savedAt: string;
};

const STORAGE_PREFIX = 'opap-application-draft-';

/**
 * Callers include the applicant and listing IDs, so answers cannot cross
 * sign-ins or become the starting point for another job.
 */
function storageKey(jobId: string): string {
    return `${STORAGE_PREFIX}${jobId}`;
}

export function emptyDraft(): ApplicationDraft {
    return {
        resumeId: null,
        uploadedResume: null,
        coverLetter: '',
        answers: {},
    };
}

/** A draft with nothing in it but the step bookkeeping. */
export function newDraftRecord(): ApplicationDraftRecord {
    return {
        ...emptyDraft(),
        furthestStep: 1,
        savedAt: new Date().toISOString(),
    };
}

/**
 * The furthest step reached so far, never moving backwards. `Math.max`
 * widens to `number`, so the result is narrowed back to a real step here
 * rather than at each call site.
 */
export function advanceStep(
    current: ApplicationStep,
    next: ApplicationStep,
): ApplicationStep {
    return (next > current ? next : current) as ApplicationStep;
}

function isRecord(
    value: unknown,
): value is Partial<ApplicationDraftRecord> & { version?: number } {
    return typeof value === 'object' && value !== null;
}

/**
 * Reads a stored draft. Anything unreadable — private browsing, a schema
 * change, a half-written value from an interrupted tab — lands on a fresh
 * draft rather than throwing, because losing the wizard to a parse error
 * would be worse than starting again.
 */
export function readApplicationDraft(jobId: string): ApplicationDraftRecord {
    const fresh = newDraftRecord();

    if (typeof window === 'undefined') {
        return fresh;
    }

    try {
        const raw = window.localStorage.getItem(storageKey(jobId));

        if (!raw) {
            return fresh;
        }

        const parsed: unknown = JSON.parse(raw);

        if (!isRecord(parsed)) {
            return fresh;
        }

        return {
            resumeId:
                typeof parsed.resumeId === 'string' ? parsed.resumeId : null,
            uploadedResume: isUploadedResume(parsed.uploadedResume)
                ? parsed.uploadedResume
                : null,
            coverLetter:
                typeof parsed.coverLetter === 'string'
                    ? parsed.coverLetter
                    : '',
            answers: isAnswerMap(parsed.answers) ? parsed.answers : {},
            furthestStep:
                parsed.version !== 2 && parsed.furthestStep === 3
                    ? 4
                    : isStep(parsed.furthestStep)
                      ? parsed.furthestStep
                      : 1,
            savedAt:
                typeof parsed.savedAt === 'string'
                    ? parsed.savedAt
                    : fresh.savedAt,
        };
    } catch {
        return fresh;
    }
}

export function writeApplicationDraft(
    jobId: string,
    draft: ApplicationDraftRecord,
): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(
            storageKey(jobId),
            JSON.stringify({
                ...draft,
                version: 2,
                savedAt: new Date().toISOString(),
            }),
        );
    } catch {
        // The wizard still works; only the "we kept your answers" promise
        // cannot be made when storage is unavailable.
    }
}

export function clearApplicationDraft(jobId: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.removeItem(storageKey(jobId));
    } catch {
        // Nothing to do: an undeletable draft is only read back on a later
        // visit to the same listing, and a new application overwrites it.
    }
}

function isStep(value: unknown): value is ApplicationStep {
    return value === 1 || value === 2 || value === 3 || value === 4;
}

function isUploadedResume(value: unknown): value is {
    name: string;
    size: string;
} {
    return (
        typeof value === 'object' &&
        value !== null &&
        'name' in value &&
        typeof (value as { name: unknown }).name === 'string' &&
        'size' in value &&
        typeof (value as { size: unknown }).size === 'string'
    );
}

function isAnswerMap(
    value: unknown,
): value is Record<string, string | string[]> {
    return (
        typeof value === 'object' &&
        value !== null &&
        Object.values(value).every(
            (answer) =>
                typeof answer === 'string' ||
                (Array.isArray(answer) &&
                    answer.every((item) => typeof item === 'string')),
        )
    );
}
