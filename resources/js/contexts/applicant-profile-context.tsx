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
import ApplicantProfileController from '@/actions/App/Http/Controllers/ApplicantProfileController';
import { toast } from '@/components/ui/sonner';
import type {
    ApplicantProfile,
    ProfileOwner,
    ResumeCertification,
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
    /** Save every change to the server. Only the profile page edits it. */
    persist?: boolean;
};

/** The profile in the shape `UpdateApplicantProfileRequest` validates. */
function toPayload(profile: ApplicantProfile) {
    return {
        name: profile.name,
        headline: profile.headline,
        phone: profile.phone,
        location: profile.location,
        summary: profile.summary,
        is_visible: profile.visibleToEmployers,
        experiences: profile.experiences.map(
            ({ role, company, start, end, location, description }) => ({
                role,
                company,
                start,
                end,
                location,
                description,
            }),
        ),
        education: profile.education.map(
            ({ school, degree, field, start, end }) => ({
                school,
                degree,
                field,
                start,
                end,
            }),
        ),
        certifications: profile.certifications.map((entry) => ({
            name: entry.name,
            issuer: entry.issuer,
            issued_on: entry.issueDate,
            expires_on: entry.expiryDate,
            credential_url: entry.credentialUrl,
        })),
        skills: profile.skills.map(({ name, level }) => ({
            name,
            level: level.toLowerCase(),
        })),
    };
}

/**
 * The applicant's profile, read from the database.
 *
 * Pages that need it (the profile and the apply wizard) receive a `profile`
 * prop; anywhere else, and for a guest, the profile starts empty. With
 * `persist`, each change is saved straight away: it shows at once, and the
 * stored version comes back with the page props (or is restored if the save
 * is refused).
 */
export function ApplicantProfileProvider({
    owner,
    children,
    persist = false,
}: ProviderProps) {
    const { props } = usePage<{ profile?: ApplicantProfile | null }>();
    const stored = props.profile ?? null;
    // `owner` is rebuilt every render, so only its fields are depended on.
    const ownerName = owner?.name;
    const ownerEmail = owner?.email;
    const ownerAvatar = owner?.avatar;

    const fromServer = useCallback(
        (): ApplicantProfile =>
            stored
                ? { ...stored, avatarUrl: ownerAvatar ?? stored.avatarUrl }
                : emptyProfile(
                      ownerName === undefined
                          ? null
                          : {
                                name: ownerName,
                                email: ownerEmail ?? '',
                                avatar: ownerAvatar,
                            },
                  ),
        [stored, ownerName, ownerEmail, ownerAvatar],
    );

    const [profile, setProfile] = useState<ApplicantProfile>(fromServer);

    // Fresh page props (after a save, upload or removal) are the truth.
    useEffect(() => setProfile(fromServer()), [fromServer]);

    /** Every mutation goes through here. */
    const commit = useCallback(
        (next: ApplicantProfile) => {
            setProfile(next);

            if (!persist) {
                return;
            }

            router.put(
                ApplicantProfileController.update.url(),
                toPayload(next),
                {
                    preserveScroll: true,
                    preserveState: true,
                    onError: (errors) => {
                        toast.error(
                            Object.values(errors)[0] ??
                                'Your profile was not saved. Please try again.',
                        );
                        setProfile(fromServer());
                    },
                },
            );
        },
        [fromServer, persist],
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
        }),
        [commit, editList, profile, replace],
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
