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
import { buildApplicantProfile } from '@/data/applicant-profile';
import type {
    ApplicantProfile,
    ProfileOwner,
    ResumeCertification,
    ResumeDocument,
    ResumeEducation,
    ResumeExperience,
    ResumeSkill,
} from '@/types/applicant-profile';

const STORAGE_KEY = 'opap-applicant-profile';

/**
 * Bumped whenever the stored shape changes.
 *
 * A record without the current version is treated as absent rather than
 * merged. Otherwise a value left behind by an older build would be spread
 * over the seed, and an empty `experiences: []` would quietly replace the
 * demo history with nothing — which looks like data loss to the applicant.
 */
const STORAGE_VERSION = 2;

/**
 * What a guest browsing a listing is scored against.
 *
 * The demo resume stands in so the match report still renders on a public
 * listing, and the same "Send me to sign in" wall keeps the guest from
 * submitting it as if it were theirs.
 */
const GUEST_OWNER: ProfileOwner = {
    name: 'Your profile',
    email: '',
};

type ApplicantProfileValue = {
    profile: ApplicantProfile;
    /** Replaces the whole profile, e.g. after loading it from an API. */
    replace: (profile: ApplicantProfile) => void;
    addExperience: (entry: ResumeExperience) => void;
    updateExperience: (id: string, entry: ResumeExperience) => void;
    removeExperience: (id: string) => void;
    addEducation: (entry: ResumeEducation) => void;
    updateEducation: (id: string, entry: ResumeEducation) => void;
    removeEducation: (id: string) => void;
    addCertification: (entry: ResumeCertification) => void;
    updateCertification: (id: string, entry: ResumeCertification) => void;
    removeCertification: (id: string) => void;
    setSkills: (skills: ResumeSkill[]) => void;
    addDocument: (document: ResumeDocument) => void;
    removeDocument: (id: string) => void;
    /** True once the applicant has saved something in this session. */
    hasUnsavedChanges: boolean;
};

const ApplicantProfileContext = createContext<
    ApplicantProfileValue | undefined
>(undefined);

/** Only the fields that survive a reload; the identity fields come from the user. */
type StoredProfile = Pick<
    ApplicantProfile,
    | 'headline'
    | 'phone'
    | 'location'
    | 'summary'
    | 'visibleToEmployers'
    | 'experiences'
    | 'education'
    | 'certifications'
    | 'skills'
    | 'documents'
    | 'coverLetter'
>;

type StoredRecord = Partial<StoredProfile> & { version?: number };

function isStoredRecord(value: unknown): value is StoredRecord {
    return (
        typeof value === 'object' &&
        value !== null &&
        (value as StoredRecord).version === STORAGE_VERSION &&
        Array.isArray((value as StoredProfile).experiences) &&
        Array.isArray((value as StoredProfile).skills) &&
        Array.isArray((value as StoredProfile).documents)
    );
}

/**
 * Reads a saved profile, if there is one that still looks like a profile.
 *
 * Storage can be unavailable or hold something an older build wrote, so an
 * unreadable or out-of-date value falls back to the seeded profile rather
 * than throwing — a blank resume would be worse than a seeded one.
 */
function readStoredProfile(): Partial<StoredProfile> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return {};
        }

        const parsed: unknown = JSON.parse(raw);

        if (!isStoredRecord(parsed)) {
            return {};
        }

        const { version: _version, ...rest } = parsed;
        void _version;

        return rest;
    } catch {
        return {};
    }
}

/** The signed-in applicant behind the profile. */
type ProviderProps = {
    /**
     * The signed-in user, or `null` for a guest browsing a listing. A guest
     * gets the seeded profile so public pages can still render a match
     * report; nothing they see is ever written to storage.
     */
    owner: ProfileOwner | null;
    children: ReactNode;
};

/** Merges stored fields over the seeded profile. */
function hydrate(owner: ProfileOwner): ApplicantProfile {
    return { ...buildApplicantProfile(owner), ...readStoredProfile() };
}

/**
 * The applicant's resume, held for the whole session.
 *
 * The resume editor and the apply wizard both read from here, so a document
 * added on the resume page is the document the wizard offers to send. There
 * is deliberately no server call: everything lives on this device until the
 * application's own API is written.
 */
export function ApplicantProfileProvider({ owner, children }: ProviderProps) {
    const effectiveOwner = owner ?? GUEST_OWNER;

    // Seeded first so the server and the client agree on the first frame;
    // the saved profile arrives on the mount tick after that.
    const [profile, setProfile] = useState<ApplicantProfile>(() =>
        buildApplicantProfile(effectiveOwner),
    );
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const hasLoaded = useRef(false);

    useEffect(() => {
        setProfile(hydrate(effectiveOwner));
        hasLoaded.current = true;
        // The signed-in user is fixed for a session, so this runs once.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Every mutation goes through here so persistence is never forgotten. */
    const commit = useCallback(
        (next: ApplicantProfile) => {
            setProfile(next);
            setHasUnsavedChanges(true);

            // A guest's edits are never written: their profile is a placeholder.
            if (!owner) {
                return;
            }

            try {
                const { name: _n, email: _e, avatarUrl: _a, ...rest } = next;
                void _n;
                void _e;
                void _a;

                window.localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({ ...rest, version: STORAGE_VERSION }),
                );
            } catch {
                // The in-memory profile still works for this session.
            }
        },
        [owner],
    );

    const replace = useCallback(
        (next: ApplicantProfile) => commit(next),
        [commit],
    );

    const editList = useCallback(
        <
            K extends
                | 'experiences'
                | 'education'
                | 'certifications'
                | 'documents',
        >(
            key: K,
            id: string,
            patch: Partial<ApplicantProfile[K][number]>,
        ) => {
            commit({
                ...profile,
                [key]: profile[key].map((item) =>
                    item.id === id ? { ...item, ...patch } : item,
                ),
            });
        },
        [commit, profile],
    );

    const value = useMemo<ApplicantProfileValue>(
        () => ({
            profile,
            replace,
            hasUnsavedChanges,
            addExperience: (entry) =>
                commit({
                    ...profile,
                    experiences: [entry, ...profile.experiences],
                }),
            updateExperience: (id, entry) => editList('experiences', id, entry),
            removeExperience: (id) =>
                commit({
                    ...profile,
                    experiences: profile.experiences.filter(
                        (item) => item.id !== id,
                    ),
                }),
            addEducation: (entry) =>
                commit({
                    ...profile,
                    education: [entry, ...profile.education],
                }),
            updateEducation: (id, entry) => editList('education', id, entry),
            removeEducation: (id) =>
                commit({
                    ...profile,
                    education: profile.education.filter(
                        (item) => item.id !== id,
                    ),
                }),
            addCertification: (entry) =>
                commit({
                    ...profile,
                    certifications: [entry, ...profile.certifications],
                }),
            updateCertification: (id, entry) =>
                editList('certifications', id, entry),
            removeCertification: (id) =>
                commit({
                    ...profile,
                    certifications: profile.certifications.filter(
                        (item) => item.id !== id,
                    ),
                }),
            setSkills: (skills) => commit({ ...profile, skills }),
            addDocument: (document) =>
                commit({
                    ...profile,
                    documents: [
                        document,
                        ...profile.documents.map((item) => ({
                            ...item,
                            primary: false,
                        })),
                    ],
                }),
            removeDocument: (id) =>
                commit({
                    ...profile,
                    documents: profile.documents.filter(
                        (item) => item.id !== id,
                    ),
                }),
        }),
        [commit, editList, hasUnsavedChanges, profile, replace],
    );

    return (
        <ApplicantProfileContext.Provider value={value}>
            {children}
        </ApplicantProfileContext.Provider>
    );
}

export function useApplicantProfile(): ApplicantProfileValue {
    const context = useContext(ApplicantProfileContext);

    if (!context) {
        throw new Error(
            'useApplicantProfile must be used inside an ApplicantProfileProvider',
        );
    }

    return context;
}
