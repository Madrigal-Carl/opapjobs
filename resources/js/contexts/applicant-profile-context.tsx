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
    ApplicantProfile,
    ProfileOwner,
    ResumeCertification,
    ResumeDocument,
    ResumeEducation,
    ResumeExperience,
    ResumeSkill,
} from '@/types/applicant-profile';

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
    /** True once the applicant has changed something in this page view. */
    hasUnsavedChanges: boolean;
};

const ApplicantProfileContext = createContext<
    ApplicantProfileValue | undefined
>(undefined);

/** A resume with nothing filled in yet, for a guest or a page without one. */
function emptyProfile(owner: ProfileOwner | null): ApplicantProfile {
    return {
        name: owner?.name ?? 'Your profile',
        headline: '',
        email: owner?.email ?? '',
        phone: '',
        location: '',
        avatarUrl: owner?.avatar ?? '',
        summary: '',
        visibleToEmployers: true,
        experiences: [],
        education: [],
        certifications: [],
        skills: [],
        documents: [],
        coverLetter: '',
    };
}

/** The signed-in applicant behind the profile. */
type ProviderProps = {
    /** The signed-in user, or `null` for a guest. */
    owner: ProfileOwner | null;
    children: ReactNode;
};

/**
 * The applicant's resume, read from the database.
 *
 * Pages that need it (the resume and the apply wizard) receive a `resume`
 * prop; anywhere else, and for a guest, the profile starts empty. Resume
 * edits are not stored yet, so changes only last for this page view.
 */
export function ApplicantProfileProvider({ owner, children }: ProviderProps) {
    const { props } = usePage<{ resume?: ApplicantProfile | null }>();
    const stored = props.resume ?? null;

    const [profile, setProfile] = useState<ApplicantProfile>(() =>
        stored
            ? { ...stored, avatarUrl: owner?.avatar ?? stored.avatarUrl }
            : emptyProfile(owner),
    );
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    /** Every mutation goes through here. */
    const commit = useCallback((next: ApplicantProfile) => {
        setProfile(next);
        setHasUnsavedChanges(true);
    }, []);

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
