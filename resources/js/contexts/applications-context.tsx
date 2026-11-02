import { usePage } from '@inertiajs/react';
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
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
};

const ApplicationsContext = createContext<ApplicationsContextValue | undefined>(
    undefined,
);

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
 * The applicant's applied / saved / archived job post ids, read from the
 * database through the shared `applicantActivity` prop.
 *
 * Saving and applying are not stored yet, so `toggleSaved` and
 * `markApplied` only change this page view: the next visit shows what the
 * database holds again. A guest (or any non-applicant) gets empty lists,
 * so no page ever claims they sent an application they did not.
 */
export function ApplicationsProvider({ children }: { children: ReactNode }) {
    const { props } = usePage();
    const stored = props.applicantActivity ?? null;

    const [activity, setActivity] = useState<ApplicationActivity>(() =>
        stored
            ? {
                  applied: [...stored.applied],
                  saved: [...stored.saved],
                  archived: [...stored.archived],
              }
            : emptyActivity(),
    );

    const toggleSaved = useCallback((jobId: string) => {
        setActivity((current) => ({
            ...current,
            saved: current.saved.includes(jobId)
                ? withoutId(current.saved, jobId)
                : withId(current.saved, jobId),
        }));
    }, []);

    const markApplied = useCallback((jobId: string) => {
        setActivity((current) => ({
            ...current,
            applied: withId(current.applied, jobId),
            archived: withoutId(current.archived, jobId),
        }));
    }, []);

    const value = useMemo<ApplicationsContextValue>(
        () => ({
            ...activity,
            isApplied: (jobId) =>
                activity.applied.includes(jobId) ||
                activity.archived.includes(jobId),
            isSaved: (jobId) => activity.saved.includes(jobId),
            isArchived: (jobId) => activity.archived.includes(jobId),
            toggleSaved,
            markApplied,
        }),
        [activity, markApplied, toggleSaved],
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
