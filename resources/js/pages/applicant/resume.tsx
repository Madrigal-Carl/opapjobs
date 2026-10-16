import { Head, usePage } from '@inertiajs/react';
import {
    Award,
    BriefcaseBusiness,
    Download,
    Eye,
    FileText,
    FolderOpen,
    GraduationCap,
    Pencil,
    Plus,
    Trash2,
    Wrench,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResumeCover } from '@/components/applicant/resume-cover';
import {
    ResumeEditDrawer,
    type ResumeDrawerSection,
    type ResumeDrawerValues,
} from '@/components/applicant/resume-edit-drawer';
import {
    ResumePageNav,
    ResumeSectionCard,
    type ResumeNavItem,
} from '@/components/applicant/resume-section-card';
import { toast } from '@/components/ui/sonner';
import { getNameInitials } from '@/lib/name-initials';
import {
    buildApplicantProfile,
    countLabel,
    formatToday,
    newEntryId,
    resumeCompleteness,
} from '@/data/applicant-profile';
import type {
    ApplicantProfile,
    ResumeCertification,
    ResumeDocument,
    ResumeEducation,
    ResumeExperience,
    ResumeSkill,
    SkillLevel,
} from '@/types/applicant-profile';

type DrawerState = {
    open: boolean;
    section: ResumeDrawerSection | null;
    entryId: string | null;
};

const LEVELS: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

function IconButton({
    label,
    onClick,
    testId,
    children,
}: {
    label: string;
    onClick: () => void;
    testId: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            data-testid={testId}
            onClick={onClick}
            className="resume-icon-button"
        >
            {children}
        </button>
    );
}

function AddButton({
    label,
    onClick,
    testId,
}: {
    label: string;
    onClick: () => void;
    testId: string;
}) {
    return (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            className="resume-add-button"
        >
            <Plus size={13} aria-hidden="true" />
            {label}
        </button>
    );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
    return <p className="resume-empty-hint">{children}</p>;
}

function LevelDots({ level }: { level: SkillLevel }) {
    const filled = LEVELS.indexOf(level) + 1;

    return (
        <span
            className="flex items-center gap-1"
            role="img"
            aria-label={`${level} proficiency`}
        >
            {LEVELS.map((option, index) => (
                <span
                    key={option}
                    className={
                        index < filled
                            ? 'size-1.5 rounded-full bg-[var(--teal)]'
                            : 'size-1.5 rounded-full bg-[var(--line)]'
                    }
                />
            ))}
        </span>
    );
}

function EntryActions({
    editLabel,
    editTestId,
    onEdit,
    deleteLabel,
    deleteTestId,
    onDelete,
}: {
    editLabel: string;
    editTestId: string;
    onEdit: () => void;
    deleteLabel: string;
    deleteTestId: string;
    onDelete: () => void;
}) {
    return (
        <div className="flex shrink-0 items-center gap-1.5">
            <IconButton label={editLabel} testId={editTestId} onClick={onEdit}>
                <Pencil size={15} aria-hidden="true" />
            </IconButton>
            <IconButton
                label={deleteLabel}
                testId={deleteTestId}
                onClick={onDelete}
            >
                <Trash2 size={15} aria-hidden="true" />
            </IconButton>
        </div>
    );
}

export default function Resume() {
    const { props } = usePage();
    const user = props.auth.user;

    const [profile, setProfile] = useState<ApplicantProfile>(() =>
        buildApplicantProfile(user),
    );
    const [drawer, setDrawer] = useState<DrawerState>({
        open: false,
        section: null,
        entryId: null,
    });
    const [dirty, setDirty] = useState(false);

    const openDrawer = (
        section: ResumeDrawerSection,
        entryId: string | null = null,
    ) => {
        setDrawer({ open: true, section, entryId });
    };

    const closeDrawer = () => {
        setDrawer({ open: false, section: null, entryId: null });
        setDirty(false);
    };

    const drawerEntry = useMemo<ResumeDrawerValues | null>(() => {
        const { entryId, section } = drawer;

        if (!entryId || !section) {
            return null;
        }

        if (section === 'experience') {
            const entry = profile.experiences.find(
                (item) => item.id === entryId,
            );

            return entry ? { ...entry } : null;
        }

        if (section === 'education') {
            const entry = profile.education.find((item) => item.id === entryId);

            return entry ? { ...entry } : null;
        }

        if (section === 'certification') {
            const entry = profile.certifications.find(
                (item) => item.id === entryId,
            );

            return entry ? { ...entry } : null;
        }

        if (section === 'skill') {
            const entry = profile.skills.find((item) => item.id === entryId);

            return entry ? { ...entry } : null;
        }

        if (section === 'document') {
            const entry = profile.documents.find((item) => item.id === entryId);

            return entry ? { ...entry } : null;
        }

        return null;
    }, [drawer, profile]);

    /** Warns before a refresh or close silently throws away edits. */
    useEffect(() => {
        if (!dirty) {
            return;
        }

        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
        };

        window.addEventListener('beforeunload', onBeforeUnload);

        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirty]);

    const handleAvatarChange = useCallback((file: File) => {
        setProfile((current) => ({
            ...current,
            avatarUrl: URL.createObjectURL(file),
        }));
        toast.success('Photo updated');
    }, []);

    const upsertEntry = <T extends { id: string }>(
        list: T[],
        entry: T,
        entryId: string | null,
    ) => {
        if (entryId) {
            return list.map((item) => (item.id === entryId ? entry : item));
        }

        return [entry, ...list];
    };

    const handleDrawerSave = (values: ResumeDrawerValues) => {
        const { entryId, section } = drawer;

        if (!section) {
            return;
        }

        const text = (key: string) => String(values[key] ?? '');
        const flag = (key: string) => Boolean(values[key]);

        if (section === 'profileHeader') {
            setProfile((current) => ({
                ...current,
                name: text('name'),
                headline: text('headline'),
                email: text('email'),
                phone: text('phone'),
                location: text('location'),
            }));
            toast.success('Profile details saved');
        } else if (section === 'summary') {
            setProfile((current) => ({ ...current, summary: text('summary') }));
            toast.success('Summary saved');
        } else if (section === 'experience') {
            const entry: ResumeExperience = {
                id: entryId ?? newEntryId(),
                role: text('role'),
                company: text('company'),
                start: text('start'),
                end: text('end'),
                location: text('location'),
                description: text('description'),
            };

            setProfile((current) => ({
                ...current,
                experiences: upsertEntry(current.experiences, entry, entryId),
            }));
            toast.success('Career history saved');
        } else if (section === 'education') {
            const entry: ResumeEducation = {
                id: entryId ?? newEntryId(),
                school: text('school'),
                degree: text('degree'),
                field: text('field'),
                start: text('start'),
                end: text('end'),
            };

            setProfile((current) => ({
                ...current,
                education: upsertEntry(current.education, entry, entryId),
            }));
            toast.success('Education saved');
        } else if (section === 'certification') {
            const entry: ResumeCertification = {
                id: entryId ?? newEntryId(),
                name: text('name'),
                issuer: text('issuer'),
                issueDate: text('issueDate'),
                expiryDate: text('expiryDate'),
                credentialUrl: text('credentialUrl'),
            };

            setProfile((current) => ({
                ...current,
                certifications: upsertEntry(
                    current.certifications,
                    entry,
                    entryId,
                ),
            }));
            toast.success('Certification saved');
        } else if (section === 'skill') {
            const level = text('level');
            const entry: ResumeSkill = {
                id: entryId ?? newEntryId(),
                name: text('name'),
                level: (LEVELS.find((option) => option === level) ??
                    'Intermediate') as SkillLevel,
            };

            setProfile((current) => ({
                ...current,
                skills: upsertEntry(current.skills, entry, entryId),
            }));
            toast.success('Skill saved');
        } else if (section === 'document') {
            const primary = flag('primary');
            const entry: ResumeDocument = {
                id: entryId ?? newEntryId(),
                name: text('fileName'),
                uploadedAt:
                    profile.documents.find((item) => item.id === entryId)
                        ?.uploadedAt ?? formatToday(),
                size: text('fileSize'),
                url: text('fileUrl'),
                primary,
            };

            setProfile((current) => ({
                ...current,
                documents: upsertEntry(current.documents, entry, entryId).map(
                    (item) =>
                        primary && item.id !== entry.id
                            ? { ...item, primary: false }
                            : item,
                ),
            }));
            toast.success('Resume document list updated');
        }

        closeDrawer();
    };

    const handleDrawerDelete = () => {
        const { entryId, section } = drawer;

        if (!entryId || !section) {
            return;
        }

        const drop = <T extends { id: string }>(list: T[]) =>
            list.filter((item) => item.id !== entryId);

        if (section === 'experience') {
            setProfile((current) => ({
                ...current,
                experiences: drop(current.experiences),
            }));
        } else if (section === 'education') {
            setProfile((current) => ({
                ...current,
                education: drop(current.education),
            }));
        } else if (section === 'certification') {
            setProfile((current) => ({
                ...current,
                certifications: drop(current.certifications),
            }));
        } else if (section === 'skill') {
            setProfile((current) => ({
                ...current,
                skills: drop(current.skills),
            }));
        } else if (section === 'document') {
            setProfile((current) => ({
                ...current,
                documents: drop(current.documents),
            }));
        }

        toast.success('The entry was removed from your resume');
        closeDrawer();
    };

    const completeness = useMemo(() => resumeCompleteness(profile), [profile]);

    const navItems: ResumeNavItem[] = useMemo(
        () => [
            {
                id: 'resume-summary',
                label: 'Personal Summary',
                icon: FileText,
            },
            {
                id: 'resume-experience',
                label: 'Career History',
                icon: BriefcaseBusiness,
                count: profile.experiences.length,
            },
            {
                id: 'resume-education',
                label: 'Education',
                icon: GraduationCap,
                count: profile.education.length,
            },
            {
                id: 'resume-certifications',
                label: 'Certifications',
                icon: Award,
                count: profile.certifications.length,
            },
            {
                id: 'resume-skills',
                label: 'Skills',
                icon: Wrench,
                count: profile.skills.length,
            },
            {
                id: 'resume-documents',
                label: 'Resume & Files',
                icon: FolderOpen,
                count: profile.documents.length,
            },
        ],
        [profile],
    );

    return (
        <>
            <Head title="My Resume | OPAP Job Abroad">
                <meta
                    name="description"
                    content="Keep your resume, career history, education, certifications and documents in one place, ready to attach to any overseas job application."
                />
            </Head>

            <ResumeCover
                avatarUrl={profile.avatarUrl}
                name={profile.name}
                headline={profile.headline}
                email={profile.email}
                phone={profile.phone}
                location={profile.location}
                initials={getNameInitials(profile.name)}
                completeness={completeness}
                onEditProfile={() => openDrawer('profileHeader')}
                onAvatarChange={handleAvatarChange}
            />

            <div className="resume-body">
                <div className="mx-auto max-w-6xl">
                    <div className="resume-mobile-nav">
                        <ResumePageNav
                            items={navItems}
                            orientation="horizontal"
                        />
                    </div>

                    <div className="resume-layout">
                        <aside className="resume-rail">
                            <ResumePageNav
                                items={navItems}
                                className="resume-nav"
                            />
                        </aside>

                        <div className="min-w-0 space-y-5">
                            <ResumeSectionCard
                                id="resume-summary"
                                eyebrow="About me"
                                title="Personal Summary"
                                icon={FileText}
                                testId="card-summary"
                                action={
                                    <IconButton
                                        label="Edit summary"
                                        testId="button-edit-summary"
                                        onClick={() => openDrawer('summary')}
                                    >
                                        <Pencil size={15} aria-hidden="true" />
                                    </IconButton>
                                }
                            >
                                {profile.summary.trim() ? (
                                    <p className="text-[15px] leading-7 text-[var(--slate)]">
                                        {profile.summary}
                                    </p>
                                ) : (
                                    <EmptyHint>
                                        Add a short paragraph about your
                                        background.
                                    </EmptyHint>
                                )}
                            </ResumeSectionCard>

                            <ResumeSectionCard
                                id="resume-experience"
                                eyebrow="Work experience"
                                title="Career History"
                                count={countLabel(
                                    profile.experiences.length,
                                    'entry',
                                )}
                                icon={BriefcaseBusiness}
                                testId="card-experience"
                                action={
                                    <AddButton
                                        label="Add"
                                        testId="button-add-experience"
                                        onClick={() => openDrawer('experience')}
                                    />
                                }
                            >
                                {profile.experiences.length === 0 ? (
                                    <EmptyHint>
                                        Add your first work experience entry.
                                    </EmptyHint>
                                ) : (
                                    <ul className="resume-timeline">
                                        {profile.experiences.map(
                                            (item, index) => (
                                                <li
                                                    key={item.id}
                                                    className="resume-timeline-item"
                                                >
                                                    {index <
                                                        profile.experiences
                                                            .length -
                                                            1 && (
                                                        <span
                                                            className="resume-timeline-line"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                    <span
                                                        className="resume-timeline-dot"
                                                        aria-hidden="true"
                                                    />
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="min-w-0">
                                                            <p className="resume-timeline-meta">
                                                                {item.start} –{' '}
                                                                {item.end ||
                                                                    'Present'}
                                                                {item.location
                                                                    ? ` · ${item.location}`
                                                                    : ''}
                                                            </p>
                                                            <h3 className="mt-1 font-serif text-base font-bold text-[var(--navy)]">
                                                                {item.role}
                                                            </h3>
                                                            <p className="mt-0.5 text-sm font-medium text-[var(--ink)]">
                                                                {item.company}
                                                            </p>
                                                            {item.description && (
                                                                <p className="mt-2 text-sm leading-relaxed text-[var(--slate)]">
                                                                    {
                                                                        item.description
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                        <EntryActions
                                                            editLabel={`Edit ${item.role}`}
                                                            editTestId={`button-edit-experience-${item.id}`}
                                                            onEdit={() =>
                                                                openDrawer(
                                                                    'experience',
                                                                    item.id,
                                                                )
                                                            }
                                                            deleteLabel={`Remove ${item.role}`}
                                                            deleteTestId={`button-delete-experience-${item.id}`}
                                                            onDelete={() =>
                                                                openDrawer(
                                                                    'experience',
                                                                    item.id,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                )}
                            </ResumeSectionCard>

                            <ResumeSectionCard
                                id="resume-education"
                                eyebrow="Schooling"
                                title="Education"
                                count={countLabel(
                                    profile.education.length,
                                    'entry',
                                )}
                                icon={GraduationCap}
                                testId="card-education"
                                action={
                                    <AddButton
                                        label="Add"
                                        testId="button-add-education"
                                        onClick={() => openDrawer('education')}
                                    />
                                }
                            >
                                {profile.education.length === 0 ? (
                                    <EmptyHint>
                                        Add your educational background.
                                    </EmptyHint>
                                ) : (
                                    <ul>
                                        {profile.education.map((item) => (
                                            <li
                                                key={item.id}
                                                className="resume-list-row"
                                            >
                                                <div className="flex min-w-0 items-start gap-3">
                                                    <span
                                                        className="resume-list-icon"
                                                        aria-hidden="true"
                                                    >
                                                        <GraduationCap
                                                            size={18}
                                                        />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <h3 className="font-serif text-base font-bold text-[var(--navy)]">
                                                            {item.school}
                                                        </h3>
                                                        <p className="mt-0.5 text-sm font-medium text-[var(--ink)]">
                                                            {item.degree}
                                                            {item.field
                                                                ? `, ${item.field}`
                                                                : ''}
                                                        </p>
                                                        <p className="resume-timeline-meta">
                                                            {item.start}
                                                            {item.end
                                                                ? ` – ${item.end}`
                                                                : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <EntryActions
                                                    editLabel={`Edit ${item.school}`}
                                                    editTestId={`button-edit-education-${item.id}`}
                                                    onEdit={() =>
                                                        openDrawer(
                                                            'education',
                                                            item.id,
                                                        )
                                                    }
                                                    deleteLabel={`Remove ${item.school}`}
                                                    deleteTestId={`button-delete-education-${item.id}`}
                                                    onDelete={() =>
                                                        openDrawer(
                                                            'education',
                                                            item.id,
                                                        )
                                                    }
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </ResumeSectionCard>

                            <ResumeSectionCard
                                id="resume-certifications"
                                eyebrow="Credentials"
                                title="Certifications"
                                count={countLabel(
                                    profile.certifications.length,
                                    'entry',
                                )}
                                icon={Award}
                                testId="card-certifications"
                                action={
                                    <AddButton
                                        label="Add"
                                        testId="button-add-certification"
                                        onClick={() =>
                                            openDrawer('certification')
                                        }
                                    />
                                }
                            >
                                {profile.certifications.length === 0 ? (
                                    <EmptyHint>
                                        Add the licences and certificates an
                                        agency will ask for.
                                    </EmptyHint>
                                ) : (
                                    <ul>
                                        {profile.certifications.map((item) => (
                                            <li
                                                key={item.id}
                                                className="resume-list-row"
                                            >
                                                <div className="flex min-w-0 items-start gap-3">
                                                    <span
                                                        className="resume-list-icon"
                                                        aria-hidden="true"
                                                    >
                                                        <Award size={18} />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <h3 className="font-serif text-base font-bold text-[var(--navy)]">
                                                            {item.name}
                                                        </h3>
                                                        <p className="mt-0.5 text-sm font-medium text-[var(--ink)]">
                                                            {item.issuer}
                                                        </p>
                                                        <p className="resume-timeline-meta">
                                                            {item.issueDate ||
                                                                '—'}
                                                            {item.expiryDate
                                                                ? ` — expires ${item.expiryDate}`
                                                                : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <EntryActions
                                                    editLabel={`Edit ${item.name}`}
                                                    editTestId={`button-edit-certification-${item.id}`}
                                                    onEdit={() =>
                                                        openDrawer(
                                                            'certification',
                                                            item.id,
                                                        )
                                                    }
                                                    deleteLabel={`Remove ${item.name}`}
                                                    deleteTestId={`button-delete-certification-${item.id}`}
                                                    onDelete={() =>
                                                        openDrawer(
                                                            'certification',
                                                            item.id,
                                                        )
                                                    }
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </ResumeSectionCard>

                            <ResumeSectionCard
                                id="resume-skills"
                                eyebrow="Capabilities"
                                title="Skills"
                                count={countLabel(
                                    profile.skills.length,
                                    'skill',
                                )}
                                icon={Wrench}
                                testId="card-skills"
                                action={
                                    <AddButton
                                        label="Add"
                                        testId="button-add-skill"
                                        onClick={() => openDrawer('skill')}
                                    />
                                }
                            >
                                {profile.skills.length === 0 ? (
                                    <EmptyHint>
                                        Add the skills an agency will scan for.
                                    </EmptyHint>
                                ) : (
                                    <ul className="flex flex-wrap gap-2">
                                        {profile.skills.map((item) => (
                                            <li
                                                key={item.id}
                                                className="resume-skill-chip"
                                            >
                                                <span>{item.name}</span>
                                                <LevelDots level={item.level} />
                                                <EntryActions
                                                    editLabel={`Edit ${item.name}`}
                                                    editTestId={`button-edit-skill-${item.id}`}
                                                    onEdit={() =>
                                                        openDrawer(
                                                            'skill',
                                                            item.id,
                                                        )
                                                    }
                                                    deleteLabel={`Remove ${item.name}`}
                                                    deleteTestId={`button-delete-skill-${item.id}`}
                                                    onDelete={() =>
                                                        openDrawer(
                                                            'skill',
                                                            item.id,
                                                        )
                                                    }
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </ResumeSectionCard>

                            <ResumeSectionCard
                                id="resume-documents"
                                eyebrow="Attachments"
                                title="Resume & Files"
                                count={countLabel(
                                    profile.documents.length,
                                    'file',
                                )}
                                icon={FolderOpen}
                                testId="card-documents"
                                action={
                                    <AddButton
                                        label="Upload"
                                        testId="button-add-document"
                                        onClick={() => openDrawer('document')}
                                    />
                                }
                            >
                                {profile.documents.length === 0 ? (
                                    <EmptyHint>
                                        Upload a resume so agencies can open it
                                        straight from your profile.
                                    </EmptyHint>
                                ) : (
                                    <ul>
                                        {profile.documents.map((item) => (
                                            <li
                                                key={item.id}
                                                className="resume-list-row"
                                            >
                                                <div className="flex min-w-0 items-start gap-3">
                                                    <span
                                                        className="resume-list-icon"
                                                        aria-hidden="true"
                                                    >
                                                        <FileText size={18} />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <h3 className="truncate font-serif text-base font-bold text-[var(--navy)]">
                                                            {item.name}
                                                        </h3>
                                                        <p className="resume-timeline-meta">
                                                            Uploaded{' '}
                                                            {item.uploadedAt} ·{' '}
                                                            {item.size}
                                                            {item.primary
                                                                ? ' · Primary'
                                                                : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    <IconButton
                                                        label={`Preview ${item.name}`}
                                                        testId={`button-preview-document-${item.id}`}
                                                        onClick={() => {
                                                            if (item.url) {
                                                                window.open(
                                                                    item.url,
                                                                    '_blank',
                                                                    'noopener,noreferrer',
                                                                );

                                                                return;
                                                            }

                                                            toast(
                                                                'This demo document has no file attached. Upload a resume to preview it.',
                                                            );
                                                        }}
                                                    >
                                                        <Eye
                                                            size={15}
                                                            aria-hidden="true"
                                                        />
                                                    </IconButton>
                                                    <IconButton
                                                        label={`Download ${item.name}`}
                                                        testId={`button-download-document-${item.id}`}
                                                        onClick={() =>
                                                            toast(
                                                                'Downloads arrive with document storage.',
                                                            )
                                                        }
                                                    >
                                                        <Download
                                                            size={15}
                                                            aria-hidden="true"
                                                        />
                                                    </IconButton>
                                                    <IconButton
                                                        label={`Edit ${item.name}`}
                                                        testId={`button-edit-document-${item.id}`}
                                                        onClick={() =>
                                                            openDrawer(
                                                                'document',
                                                                item.id,
                                                            )
                                                        }
                                                    >
                                                        <Pencil
                                                            size={15}
                                                            aria-hidden="true"
                                                        />
                                                    </IconButton>
                                                    <IconButton
                                                        label={`Remove ${item.name}`}
                                                        testId={`button-delete-document-${item.id}`}
                                                        onClick={() =>
                                                            openDrawer(
                                                                'document',
                                                                item.id,
                                                            )
                                                        }
                                                    >
                                                        <Trash2
                                                            size={15}
                                                            aria-hidden="true"
                                                        />
                                                    </IconButton>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </ResumeSectionCard>
                        </div>
                    </div>
                </div>
            </div>

            <ResumeEditDrawer
                open={drawer.open}
                section={drawer.section}
                entry={drawerEntry}
                isEditing={drawer.entryId !== null}
                onClose={closeDrawer}
                onSave={handleDrawerSave}
                onDelete={handleDrawerDelete}
                onDirtyChange={setDirty}
            />
        </>
    );
}
