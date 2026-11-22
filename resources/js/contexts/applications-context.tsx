import { router, usePage } from '@inertiajs/react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import SavedJobPostController from '@/actions/App/Http/Controllers/SavedJobPostController';
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
 * `markApplied` reflects a confirmed server submission. `toggleSaved` shows
 * the bookmark at once and stores it; the reloaded `applicantActivity` (and
 * My Jobs' own lists) then come back from the server. A guest is sent to
 * sign in. A guest (or any non-applicant) gets empty lists, so no page ever
 * claims they sent an application they did not.
 */
export function ApplicationsProvider({ children }: { children: ReactNode }) {
    const { props } = usePage();
    const stored = props.applicantActivity ?? null;

    const fromServer = useCallback(
        (): ApplicationActivity =>
            stored
                ? {
                      applied: [...stored.applied],
                      saved: [...stored.saved],
                      archived: [...stored.archived],
                  }
                : emptyActivity(),
        [stored],
    );

    const [activity, setActivity] = useState<ApplicationActivity>(fromServer);

    useEffect(() => setActivity(fromServer()), [fromServer]);

    const toggleSaved = useCallback(
        (jobId: string) => {
            const saving = !activity.saved.includes(jobId);
            const route = saving
                ? SavedJobPostController.store(jobId)
                : SavedJobPostController.destroy(jobId);

            setActivity((current) => ({
                ...current,
                saved: saving
                    ? withId(current.saved, jobId)
                    : withoutId(current.saved, jobId),
            }));

            router.visit(route.url, {
                method: route.method,
                preserveScroll: true,
                preserveState: true,
                // My Jobs lists its applied and saved rows as props of its own.
                only: ['applicantActivity', 'applied', 'saved'],
                onError: () => setActivity(fromServer()),
            });
        },
        [activity.saved, fromServer],
    );

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
