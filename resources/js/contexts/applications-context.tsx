import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { demoApplicationActivity } from '@/data/applicant-activity';
import type {
    ApplicationActivity,
    ApplicationTab,
} from '@/types/application-draft';

export type { ApplicationActivity, ApplicationTab };

type ApplicationsContextValue = ApplicationActivity & {
    isApplied: (jobId: string) => boolean;
    isSaved: (jobId: string) => boolean;
    isArchived: (jobId: string) => boolean;
    toggleSaved: (jobId: string) => void;
    markApplied: (jobId: string) => void;
    setArchived: (jobId: string, archived: boolean) => void;
    resetActivity: () => void;
};

const STORAGE_KEY = 'opap-applicant-activity';

const ApplicationsContext = createContext<ApplicationsContextValue | undefined>(
    undefined,
);

function cloneActivity(activity: ApplicationActivity): ApplicationActivity {
    return {
        applied: [...activity.applied],
        saved: [...activity.saved],
        archived: [...activity.archived],
    };
}

function isIdList(value: unknown): value is string[] {
    return (
        Array.isArray(value) && value.every((item) => typeof item === 'string')
    );
}

/**
 * Reads the stored activity, falling back to the demo seed. Storage can be
 * unavailable (private browsing, SSR) or hold something malformed from an
 * older build, so every failure path lands on the seed rather than throwing.
 */
function readStoredActivity(): ApplicationActivity {
    if (typeof window === 'undefined') {
        return cloneActivity(demoApplicationActivity);
    }

    const seed = cloneActivity(demoApplicationActivity);

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return seed;
        }

        const parsed = JSON.parse(raw) as Partial<ApplicationActivity>;

        return {
            applied: isIdList(parsed.applied) ? parsed.applied : seed.applied,
            saved: isIdList(parsed.saved) ? parsed.saved : seed.saved,
            archived: isIdList(parsed.archived)
                ? parsed.archived
                : seed.archived,
        };
    } catch {
        return seed;
    }
}

const withId = (ids: string[], jobId: string) =>
    ids.includes(jobId) ? ids : [jobId, ...ids];

const withoutId = (ids: string[], jobId: string) =>
    ids.filter((id) => id !== jobId);

const emptyActivity = (): ApplicationActivity => ({
    applied: [],
    saved: [],
    archived: [],
});

/**
 * Holds the applicant's applied / saved / archived job ids and mirrors them
 * to localStorage so the lists survive a reload.
 *
 * `isGuest` matters: the "Applied" tab makes a factual claim about what this
 * person has actually sent, so a guest must never be shown the demo seed as
 * though it were their own history. A guest gets empty lists, and nothing
 * they do is written to storage.
 */
export function ApplicationsProvider({
    isGuest = false,
    children,
}: {
    isGuest?: boolean;
    children: ReactNode;
}) {
    // Seeded first so the server and the client agree on the first frame;
    // the stored lists arrive on the mount tick after that.
    const [activity, setActivity] = useState<ApplicationActivity>(() =>
        isGuest ? emptyActivity() : cloneActivity(demoApplicationActivity),
    );
    const hasLoaded = useRef(false);

    useEffect(() => {
        setActivity(isGuest ? emptyActivity() : readStoredActivity());
        hasLoaded.current = true;
    }, [isGuest]);

    useEffect(() => {
        // Skipped until the mount effect has replaced the seed, otherwise
        // this would write the seed straight back over what was stored.
        if (!hasLoaded.current || isGuest) {
            return;
        }

        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(activity));
        } catch {
            // The in-memory lists still work when storage is unavailable.
        }
    }, [activity, isGuest]);

    const toggleSaved = useCallback((jobId: string) => {
        setActivity((current) => ({
            ...current,
            saved: current.saved.includes(jobId)
                ? withoutId(current.saved, jobId)
                : withId(current.saved, jobId),
        }));
    }, []);

    /**
     * Applying moves a listing into `applied` and takes it back out of
     * `archived`, so a restored posting never shows on two tabs at once.
     */
    const markApplied = useCallback((jobId: string) => {
        setActivity((current) => ({
            ...current,
            applied: withId(current.applied, jobId),
            archived: withoutId(current.archived, jobId),
        }));
    }, []);

    const setArchived = useCallback((jobId: string, archived: boolean) => {
        setActivity((current) => ({
            ...current,
            // Unarchiving puts the role back on the saved list. Leaving
            // `saved` untouched here read as "no longer mine", so both the
            // undo on the archive toast and "Move back to saved" silently
            // deleted the bookmark instead of restoring it.
            saved: archived
                ? withoutId(current.saved, jobId)
                : withId(current.saved, jobId),
            archived: archived
                ? withId(current.archived, jobId)
                : withoutId(current.archived, jobId),
        }));
    }, []);

    const resetActivity = useCallback(() => {
        setActivity(cloneActivity(demoApplicationActivity));
    }, []);

    const value = useMemo<ApplicationsContextValue>(
        () => ({
            ...activity,
            isApplied: (jobId) => activity.applied.includes(jobId),
            isSaved: (jobId) => activity.saved.includes(jobId),
            isArchived: (jobId) => activity.archived.includes(jobId),
            toggleSaved,
            markApplied,
            setArchived,
            resetActivity,
        }),
        [activity, markApplied, resetActivity, setArchived, toggleSaved],
    );

    return (
        <ApplicationsContext.Provider value={value}>
            {children}
        </ApplicationsContext.Provider>
    );
}

export function useApplications(): ApplicationsContextValue {
    const context = useContext(ApplicationsContext);

    if (!context) {
        throw new Error(
            'useApplications must be used inside an ApplicationsProvider',
        );
    }

    return context;
}
