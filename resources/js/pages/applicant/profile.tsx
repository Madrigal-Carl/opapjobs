import { Head, Link, router } from '@inertiajs/react';
import {
    Camera,
    CircleCheck,
    FileText,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Plus,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import {
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
    type InputHTMLAttributes,
    type ReactNode,
} from 'react';
import ApplicantProfileController from '@/actions/App/Http/Controllers/ApplicantProfileController';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ApplicantScope } from '@/components/applicant/applicant-scope';
import { FieldError } from '@/components/applicant/match-blocks';
import { toast } from '@/components/ui/sonner';
import { Textarea } from '@/components/ui/textarea';
import { useApplicantProfile } from '@/contexts/applicant-profile-context';
import { newEntryId, profileCompleteness } from '@/data/applicant-profile';
import { getNameInitials } from '@/lib/name-initials';
import { applications } from '@/routes';
import { index as jobsIndex } from '@/routes/jobs';
import {
    SKILL_LEVELS,
    SKILL_LEVEL_DOTS,
    type ApplicantProfile,
    type ResumeCertification,
    type ResumeDocument,
    type ResumeEducation,
    type ResumeExperience,
    type ResumeSkill,
    type SkillLevel,
} from '@/types/applicant-profile';

/**
 * The sections an applicant fills in, in the order they should.
 *
 * Completeness counts a section as done only when it holds at least one
 * entry, so the strength meter always points at the same thing the
 * applicant is about to read.
 */
const SECTIONS = [
    { id: 'summary', label: 'Summary', nudge: 'add a personal summary' },
    { id: 'experience', label: 'Career history', nudge: 'add a role' },
    { id: 'education', label: 'Education', nudge: 'add your education' },
    {
        id: 'certifications',
        label: 'Licences',
        nudge: 'add a licence or certificate',
    },
    { id: 'skills', label: 'Skills', nudge: 'add your skills' },
    { id: 'documents', label: 'Resumé', nudge: 'upload your resumé' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function isSectionFilled(profile: ApplicantProfile, id: SectionId): boolean {
    const filled: Record<SectionId, boolean> = {
        summary: profile.summary.trim().length > 0,
        experience: profile.experiences.length > 0,
        education: profile.education.length > 0,
        certifications: profile.certifications.length > 0,
        skills: profile.skills.length > 0,
        documents: profile.documents.length > 0,
    };

    return filled[id];
}

/**
 * The applicant's profile.
 *
 * This is the page the match report and the apply wizard both read, so it
 * deliberately shows the same fields they do rather than a prettier
 * subset: an applicant should never be told to add something here that the
 * wizard will not send.
 */
export default function ProfileEditor() {
    return (
        <ApplicantScope persistProfile>
            <ProfileEditorBody />
        </ApplicantScope>
    );
}

function ProfileEditorBody() {
    const { profile } = useApplicantProfile();
    const [editingDetails, setEditingDetails] = useState(false);

    const completeness = profileCompleteness(profile);

    return (
        <>
            <Head>
                <title>
                    {`Your Profile — ${completeness}% complete | OPAP Job Abroad`}
                </title>
            </Head>

            <ProfileHero onEdit={() => setEditingDetails(true)} />

            <section className="profile-body">
                <div className="shell">
                    <div className="profile-columns">
                        <div className="profile-main">
                            {editingDetails && (
                                <DetailsForm
                                    onDone={() => setEditingDetails(false)}
                                />
                            )}
                            <SummaryCard />
                            <ExperienceCard />
                            <EducationCard />
                            <CertificationCard />
                            <SkillsCard />
                            <DocumentsCard />
                        </div>

                        <aside className="profile-rail">
                            <StrengthCard completeness={completeness} />

                            <div className="profile-rail-card">
                                <p className="profile-rail-title">
                                    Where this is used
                                </p>
                                <p className="profile-card-lede">
                                    The match report scores this profile against
                                    each listing, and the agency reads it when
                                    your application arrives.
                                </p>
                                <div className="profile-rail-links">
                                    <Button asChild size="sm">
                                        <a href={jobsIndex.url()}>
                                            Find a role to apply for
                                        </a>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="secondary"
                                        size="sm"
                                    >
                                        <Link href={applications.url()}>
                                            See my jobs
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>
        </>
    );
}

/** Who the applicant is, the way an agency first meets them. */
function ProfileHero({ onEdit }: { onEdit: () => void }) {
    const { profile, replace } = useApplicantProfile();
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [avatarBusy, setAvatarBusy] = useState(false);

    const pickAvatar = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }

        if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
            toast.error('Choose a JPG, PNG or WEBP photo.');

            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Choose a photo no larger than 2 MB.');

            return;
        }

        router.post(
            ApplicantProfileController.updateAvatar.url(),
            { avatar: file },
            {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onStart: () => setAvatarBusy(true),
                onFinish: () => setAvatarBusy(false),
                onError: (errors) =>
                    toast.error(
                        errors.avatar ??
                            'Your photo was not saved. Please try again.',
                    ),
            },
        );
    };

    const contact = [
        { icon: MapPin, value: profile.location, label: 'Location' },
        { icon: Phone, value: profile.phone, label: 'Phone' },
        { icon: Mail, value: profile.email, label: 'Email' },
    ];

    return (
        <section className="profile-hero">
            <div className="shell">
                <div className="profile-hero-inner">
                    <div className="profile-identity">
                        <div className="profile-avatar">
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="" />
                            ) : (
                                <span aria-hidden="true">
                                    {getNameInitials(profile.name)}
                                </span>
                            )}
                            <button
                                type="button"
                                className="profile-avatar-button"
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={avatarBusy}
                                aria-busy={avatarBusy}
                                aria-label="Change profile photo"
                                data-testid="button-avatar-upload"
                            >
                                <Camera size={16} aria-hidden="true" />
                            </button>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp"
                                className="sr-only"
                                aria-label="Upload a profile photo"
                                data-testid="input-profile-avatar"
                                onChange={pickAvatar}
                            />
                        </div>

                        <div className="min-w-0">
                            <div className="eyebrow eyebrow-light">
                                <span className="eyebrow-rule" /> YOUR PROFILE
                            </div>
                            <h1 className="profile-name">
                                {profile.name || 'Your name'}
                            </h1>
                            <p className="profile-headline">
                                {profile.headline ||
                                    'Add a headline agencies read first'}
                            </p>
                            <ul className="profile-meta">
                                {contact
                                    .filter(({ value }) => value.trim() !== '')
                                    .map(({ icon: Icon, value, label }) => (
                                        <li key={label}>
                                            <Icon
                                                size={15}
                                                aria-label={label}
                                            />
                                            {value}
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="profile-hero-edit"
                        onClick={onEdit}
                        data-testid="button-edit-profile-details"
                    >
                        <Pencil size={15} aria-hidden="true" /> Edit details
                    </button>
                </div>

                <div className="profile-hero-bar">
                    <label className="profile-visibility">
                        <input
                            type="checkbox"
                            role="switch"
                            checked={profile.visibleToEmployers}
                            onChange={(event) =>
                                replace({
                                    ...profile,
                                    visibleToEmployers: event.target.checked,
                                })
                            }
                            data-testid="checkbox-profile-visible"
                        />
                        <span>
                            <strong>
                                {profile.visibleToEmployers
                                    ? 'Visible to accredited agencies.'
                                    : 'Hidden from agencies.'}
                            </strong>{' '}
                            Agencies you apply to can read this profile.
                            Employers who are not a posting agency cannot.
                        </span>
                    </label>

                    <nav className="profile-jump" aria-label="Profile sections">
                        {SECTIONS.map((section) => (
                            <a href={`#profile-${section.id}`} key={section.id}>
                                {section.label}
                            </a>
                        ))}
                    </nav>
                </div>
            </div>
        </section>
    );
}

function StrengthCard({ completeness }: { completeness: number }) {
    const { profile } = useApplicantProfile();

    const doneCount = SECTIONS.filter((section) =>
        isSectionFilled(profile, section.id),
    ).length;
    const next = SECTIONS.find(
        (section) => !isSectionFilled(profile, section.id),
    );

    return (
        <div className="profile-rail-card">
            <p className="profile-rail-title">Profile strength</p>
            <div className="profile-strength">
                <strong>{completeness}%</strong>
                <span>
                    {doneCount} of {SECTIONS.length} sections
                </span>
            </div>
            <div
                className="match-track"
                role="progressbar"
                aria-valuenow={completeness}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Profile completeness"
            >
                <div
                    className="match-fill"
                    style={{
                        width: `${completeness}%`,
                        background:
                            completeness === 100
                                ? 'var(--teal)'
                                : 'var(--amber)',
                    }}
                />
            </div>
            {next ? (
                <p className="profile-nudge">
                    <strong>Next:</strong> {next.nudge}. Profiles with every
                    section filled get read first.
                </p>
            ) : (
                <p className="profile-nudge is-done">
                    <strong>All set.</strong> Every section an agency reads is
                    filled in.
                </p>
            )}
            <ul className="profile-checklist">
                {SECTIONS.map((section) => {
                    const isDone = isSectionFilled(profile, section.id);

                    return (
                        <li key={section.id}>
                            <a
                                href={`#profile-${section.id}`}
                                className={isDone ? 'is-done' : ''}
                                data-testid={`check-profile-${section.id}`}
                            >
                                {isDone ? (
                                    <CircleCheck size={16} aria-hidden="true" />
                                ) : (
                                    <span
                                        className="profile-check-blank"
                                        aria-hidden="true"
                                    />
                                )}
                                <span>{section.label}</span>
                                <strong>{isDone ? 'Done' : 'Add'}</strong>
                            </a>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

/** The shell every profile section shares. */
function Section({
    id,
    title,
    lede,
    action,
    children,
    empty,
    isEmpty,
    onDragOver,
    onDragLeave,
    onDrop,
    dragging,
}: {
    id: SectionId;
    title: string;
    lede?: string;
    action?: ReactNode;
    children: ReactNode;
    empty?: ReactNode;
    isEmpty: boolean;
    onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
    onDragLeave?: (event: DragEvent<HTMLDivElement>) => void;
    onDrop?: (event: DragEvent<HTMLDivElement>) => void;
    dragging?: boolean;
}) {
    return (
        <div
            id={`profile-${id}`}
            className={`profile-card ${dragging ? 'is-dragging' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <div className="profile-card-head">
                <h2>{title}</h2>
                {action}
            </div>
            {lede && <p className="profile-card-lede">{lede}</p>}

            {children}

            {isEmpty && empty ? (
                <div className="profile-card-empty">{empty}</div>
            ) : null}
        </div>
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
        <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClick}
            data-testid={testId}
        >
            <Plus size={14} aria-hidden="true" /> {label}
        </Button>
    );
}

/** Name, headline and contact details, edited together. */
function DetailsForm({ onDone }: { onDone: () => void }) {
    const { profile, replace } = useApplicantProfile();
    const [draft, setDraft] = useState({
        name: profile.name,
        headline: profile.headline,
        phone: profile.phone,
        location: profile.location,
    });

    const setField = (field: keyof typeof draft) => (value: string) =>
        setDraft((current) => ({ ...current, [field]: value }));

    return (
        <div className="profile-card">
            <div className="profile-card-head">
                <h2>Your details</h2>
            </div>
            <FormShell
                onSave={() => {
                    replace({ ...profile, ...draft });
                    onDone();
                }}
                onCancel={onDone}
            >
                <div className="field-row">
                    <FormField
                        label="Full name"
                        value={draft.name}
                        onChange={setField('name')}
                        testId="input-profile-name"
                    />
                    <FormField
                        label="Headline"
                        value={draft.headline}
                        placeholder="Electrical Technician"
                        onChange={setField('headline')}
                        testId="input-profile-headline"
                    />
                </div>
                <div className="field-row">
                    <FormField
                        label="Phone"
                        value={draft.phone}
                        onChange={setField('phone')}
                        testId="input-profile-phone"
                    />
                    <FormField
                        label="Location"
                        value={draft.location}
                        onChange={setField('location')}
                        testId="input-profile-location"
                    />
                </div>
            </FormShell>
        </div>
    );
}

function SummaryCard() {
    const { profile, replace } = useApplicantProfile();
    const [editing, setEditing] = useState(false);
    const [draftSummary, setDraftSummary] = useState(profile.summary);

    const beginEdit = () => {
        setDraftSummary(profile.summary);
        setEditing(true);
    };

    const hasSummary = profile.summary.trim().length > 0;

    return (
        <Section
            id="summary"
            title="Personal summary"
            action={
                !editing && (
                    <button
                        type="button"
                        className="profile-text-button"
                        onClick={beginEdit}
                        data-testid="button-edit-profile-summary"
                    >
                        {hasSummary ? 'Edit' : 'Add summary'}
                    </button>
                )
            }
            isEmpty={!hasSummary && !editing}
            empty={
                <p>
                    Three or four lines an agency reads first. Say what you do,
                    how long you have done it, and what you are looking for.
                </p>
            }
        >
            {editing ? (
                <FormShell
                    onSave={() => {
                        replace({ ...profile, summary: draftSummary });
                        setEditing(false);
                    }}
                    onCancel={() => setEditing(false)}
                >
                    <div className="field">
                        <label
                            className="field-label"
                            htmlFor="profile-summary"
                        >
                            Your summary
                        </label>
                        <Textarea
                            id="profile-summary"
                            className="field-control"
                            rows={5}
                            value={draftSummary}
                            placeholder="What you do, how long you have done it, what you want next."
                            onChange={(event) =>
                                setDraftSummary(event.target.value)
                            }
                            data-testid="input-profile-summary"
                        />
                        <p className="field-hint">
                            {
                                draftSummary.trim().split(/\s+/).filter(Boolean)
                                    .length
                            }{' '}
                            words. Under 120 reads faster.
                        </p>
                    </div>
                </FormShell>
            ) : (
                hasSummary && (
                    <p className="profile-summary">{profile.summary.trim()}</p>
                )
            )}
        </Section>
    );
}

/** One row of a history list: an initial tile, the facts, and its actions. */
function Entry({
    initial,
    title,
    sub,
    meta,
    children,
    actions,
}: {
    initial: string;
    title: string;
    sub: string;
    meta: ReactNode;
    children?: ReactNode;
    actions: ReactNode;
}) {
    return (
        <li className="profile-entry">
            <span className="profile-entry-tile" aria-hidden="true">
                {initial.slice(0, 1).toUpperCase() || '·'}
            </span>
            <div className="profile-entry-body">
                <div className="profile-entry-head">
                    <div className="min-w-0">
                        <p className="profile-entry-title">{title}</p>
                        <p className="profile-entry-sub">{sub}</p>
                        <div className="profile-entry-meta">{meta}</div>
                    </div>
                    {actions}
                </div>
                {children}
            </div>
        </li>
    );
}

/** Editing state for a list section: `'new'` while adding, else an entry id. */
type EditingId = string | null;

type FieldErrors = Record<string, string>;

const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

/** "Mar 2021" (how the profile stores it) to "2021-03" (a month input). */
function toMonthInput(value: string): string {
    const [month, year] = value.split(' ');
    const index = MONTHS.indexOf(month);

    return index >= 0 && /^\d{4}$/.test(year ?? '')
        ? `${year}-${String(index + 1).padStart(2, '0')}`
        : '';
}

/** "2021-03" from a month input back to "Mar 2021". */
function fromMonthInput(value: string): string {
    const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
    const month = match ? MONTHS[Number(match[2]) - 1] : undefined;

    return match && month ? `${month} ${match[1]}` : '';
}

function ExperienceCard() {
    const { profile, addExperience, updateExperience, removeExperience } =
        useApplicantProfile();

    const [editingId, setEditingId] = useState<EditingId>(null);

    return (
        <Section
            id="experience"
            title="Career history"
            lede="Most recent first. A short description of what you actually did is worth more than a list of duties."
            action={
                <AddButton
                    label="Add role"
                    onClick={() => setEditingId('new')}
                    testId="button-add-experience"
                />
            }
            isEmpty={profile.experiences.length === 0 && editingId !== 'new'}
            empty={<p>No roles yet. Most agencies expect at least one.</p>}
        >
            {editingId === 'new' && (
                <ExperienceForm
                    entry={{
                        id: newEntryId(),
                        role: '',
                        company: '',
                        start: '',
                        end: '',
                        location: '',
                        description: '',
                    }}
                    onCancel={() => setEditingId(null)}
                    onSave={(next) => {
                        addExperience(next);
                        setEditingId(null);
                    }}
                />
            )}
            <ul className="profile-entries">
                {profile.experiences.map((entry) => (
                    <Entry
                        key={entry.id}
                        initial={entry.company}
                        title={entry.role}
                        sub={[entry.company, entry.location]
                            .filter(Boolean)
                            .join(' · ')}
                        meta={
                            <p className="profile-entry-dates">
                                {entry.start} — {entry.end || 'Present'}
                            </p>
                        }
                        actions={
                            <EntryActions
                                testId={entry.id}
                                label={entry.role}
                                onEdit={() =>
                                    setEditingId(
                                        editingId === entry.id
                                            ? null
                                            : entry.id,
                                    )
                                }
                                onRemove={() => removeExperience(entry.id)}
                            />
                        }
                    >
                        {entry.description && (
                            <p className="profile-entry-description">
                                {entry.description}
                            </p>
                        )}
                        {editingId === entry.id && (
                            <ExperienceForm
                                entry={entry}
                                onCancel={() => setEditingId(null)}
                                onSave={(next) => {
                                    updateExperience(entry.id, next);
                                    setEditingId(null);
                                }}
                            />
                        )}
                    </Entry>
                ))}
            </ul>
        </Section>
    );
}

function ExperienceForm({
    entry,
    onSave,
    onCancel,
}: {
    entry: ResumeExperience;
    onSave: (entry: ResumeExperience) => void;
    onCancel: () => void;
}) {
    // Months stay in the input's own "2021-03" form while editing: browsers
    // without a month picker show a text box, and must accept partial typing.
    const [draft, setDraft] = useState(() => ({
        ...entry,
        start: toMonthInput(entry.start),
        end: toMonthInput(entry.end),
    }));
    const [errors, setErrors] = useState<FieldErrors>({});
    const isMonth = (value: string) => fromMonthInput(value) !== '';

    const validate = (): FieldErrors => {
        const found: FieldErrors = {};
        if (!draft.role.trim()) found.role = 'Enter the role you held.';
        if (!draft.company.trim()) found.company = 'Enter the company name.';
        if (!isMonth(draft.start)) {
            found.start = 'Choose when you started (YYYY-MM).';
        }
        if (draft.end && !isMonth(draft.end)) {
            found.end = 'Enter the month as YYYY-MM, or leave it blank.';
        } else if (
            isMonth(draft.start) &&
            draft.end &&
            draft.end < draft.start
        ) {
            found.end = 'The end cannot be before the start.';
        }

        return found;
    };

    return (
        <FormShell
            onSave={() => {
                const found = validate();
                setErrors(found);
                if (Object.keys(found).length === 0) {
                    onSave({
                        ...draft,
                        role: draft.role.trim(),
                        company: draft.company.trim(),
                        start: fromMonthInput(draft.start),
                        end: fromMonthInput(draft.end),
                    });
                }
            }}
            onCancel={onCancel}
        >
            <div className="field-row">
                <FormField
                    label="Role"
                    required
                    value={draft.role}
                    error={errors.role}
                    onChange={(role) => setDraft({ ...draft, role })}
                    testId="input-exp-role"
                />
                <FormField
                    label="Company"
                    required
                    value={draft.company}
                    error={errors.company}
                    onChange={(company) => setDraft({ ...draft, company })}
                    testId="input-exp-company"
                />
            </div>
            <div className="field-row">
                <FormField
                    label="From"
                    type="month"
                    required
                    value={draft.start}
                    placeholder="YYYY-MM"
                    error={errors.start}
                    onChange={(start) => setDraft({ ...draft, start })}
                    testId="input-exp-start"
                />
                <FormField
                    label="To"
                    type="month"
                    value={draft.end}
                    placeholder="YYYY-MM"
                    hint="Leave blank if you still work here."
                    error={errors.end}
                    onChange={(end) => setDraft({ ...draft, end })}
                    testId="input-exp-end"
                />
            </div>
            <FormField
                label="Location"
                value={draft.location}
                onChange={(location) => setDraft({ ...draft, location })}
                testId="input-exp-location"
            />
            <div className="field">
                <label className="field-label" htmlFor="input-exp-description">
                    What you did
                </label>
                <Textarea
                    id="input-exp-description"
                    className="field-control"
                    rows={4}
                    maxLength={5000}
                    value={draft.description}
                    onChange={(event) =>
                        setDraft({ ...draft, description: event.target.value })
                    }
                    data-testid="input-exp-description"
                />
            </div>
        </FormShell>
    );
}

function EducationCard() {
    const { profile, addEducation, updateEducation, removeEducation } =
        useApplicantProfile();

    const [editingId, setEditingId] = useState<EditingId>(null);

    return (
        <Section
            id="education"
            title="Education"
            lede="Qualifications, licences and training that a listing may ask for by name."
            action={
                <AddButton
                    label="Add qualification"
                    onClick={() => setEditingId('new')}
                    testId="button-add-education"
                />
            }
            isEmpty={profile.education.length === 0 && editingId !== 'new'}
            empty={
                <p>
                    No qualifications listed. Many listings ask for at least a
                    high school certificate.
                </p>
            }
        >
            {editingId === 'new' && (
                <EducationForm
                    entry={{
                        id: newEntryId(),
                        school: '',
                        degree: '',
                        field: '',
                        start: '',
                        end: '',
                    }}
                    onCancel={() => setEditingId(null)}
                    onSave={(next) => {
                        addEducation(next);
                        setEditingId(null);
                    }}
                />
            )}
            <ul className="profile-entries">
                {profile.education.map((entry) => (
                    <Entry
                        key={entry.id}
                        initial={entry.school}
                        title={entry.degree}
                        sub={[entry.school, entry.field]
                            .filter(Boolean)
                            .join(' · ')}
                        meta={
                            <p className="profile-entry-dates">
                                {[entry.start, entry.end]
                                    .filter(Boolean)
                                    .join(' — ')}
                            </p>
                        }
                        actions={
                            <EntryActions
                                testId={entry.id}
                                label={entry.degree}
                                onEdit={() =>
                                    setEditingId(
                                        editingId === entry.id
                                            ? null
                                            : entry.id,
                                    )
                                }
                                onRemove={() => removeEducation(entry.id)}
                            />
                        }
                    >
                        {editingId === entry.id && (
                            <EducationForm
                                entry={entry}
                                onCancel={() => setEditingId(null)}
                                onSave={(next) => {
                                    updateEducation(entry.id, next);
                                    setEditingId(null);
                                }}
                            />
                        )}
                    </Entry>
                ))}
            </ul>
        </Section>
    );
}

function EducationForm({
    entry,
    onSave,
    onCancel,
}: {
    entry: ResumeEducation;
    onSave: (entry: ResumeEducation) => void;
    onCancel: () => void;
}) {
    const [draft, setDraft] = useState(entry);
    const [errors, setErrors] = useState<FieldErrors>({});
    const isYear = (value: string) => /^\d{4}$/.test(value);

    const validate = (): FieldErrors => {
        const found: FieldErrors = {};
        if (!draft.school.trim()) found.school = 'Enter the school name.';
        if (!draft.degree.trim()) found.degree = 'Enter the qualification.';
        if (!isYear(draft.start)) found.start = 'Enter a four-digit year.';
        if (draft.end && !isYear(draft.end)) {
            found.end = 'Enter a four-digit year.';
        } else if (draft.end && draft.end < draft.start) {
            found.end = 'The end cannot be before the start.';
        }

        return found;
    };

    return (
        <FormShell
            onSave={() => {
                const found = validate();
                setErrors(found);
                if (Object.keys(found).length === 0) {
                    onSave({
                        ...draft,
                        school: draft.school.trim(),
                        degree: draft.degree.trim(),
                    });
                }
            }}
            onCancel={onCancel}
        >
            <FormField
                label="School or institution"
                required
                value={draft.school}
                error={errors.school}
                onChange={(school) => setDraft({ ...draft, school })}
                testId="input-edu-school"
            />
            <div className="field-row">
                <FormField
                    label="Qualification"
                    required
                    value={draft.degree}
                    placeholder="BS Electrical Engineering"
                    error={errors.degree}
                    onChange={(degree) => setDraft({ ...draft, degree })}
                    testId="input-edu-degree"
                />
                <FormField
                    label="Field"
                    value={draft.field}
                    onChange={(field) => setDraft({ ...draft, field })}
                    testId="input-edu-field"
                />
            </div>
            <div className="field-row">
                <FormField
                    label="From (year)"
                    required
                    inputMode="numeric"
                    maxLength={4}
                    value={draft.start}
                    placeholder="2014"
                    error={errors.start}
                    onChange={(start) => setDraft({ ...draft, start })}
                    testId="input-edu-start"
                />
                <FormField
                    label="To (year)"
                    inputMode="numeric"
                    maxLength={4}
                    value={draft.end}
                    placeholder="2018"
                    error={errors.end}
                    onChange={(end) => setDraft({ ...draft, end })}
                    testId="input-edu-end"
                />
            </div>
        </FormShell>
    );
}

function CertificationCard() {
    const {
        profile,
        addCertification,
        updateCertification,
        removeCertification,
    } = useApplicantProfile();

    const [editingId, setEditingId] = useState<EditingId>(null);
    const today = new Date();

    return (
        <Section
            id="certifications"
            title="Licences & certifications"
            lede="Safety and trade certificates. Expiry dates matter — the match report only counts ones still current."
            action={
                <AddButton
                    label="Add certificate"
                    onClick={() => setEditingId('new')}
                    testId="button-add-certifications"
                />
            }
            isEmpty={profile.certifications.length === 0 && editingId !== 'new'}
            empty={
                <p>
                    No certifications yet. Safety training is required for most
                    landbased roles.
                </p>
            }
        >
            {editingId === 'new' && (
                <CertificationForm
                    entry={{
                        id: newEntryId(),
                        name: '',
                        issuer: '',
                        issueDate: '',
                        expiryDate: '',
                        credentialUrl: '',
                    }}
                    onCancel={() => setEditingId(null)}
                    onSave={(next) => {
                        addCertification(next);
                        setEditingId(null);
                    }}
                />
            )}
            <ul className="profile-entries">
                {profile.certifications.map((entry) => {
                    const expired =
                        entry.expiryDate !== '' &&
                        new Date(`${entry.expiryDate}T23:59:59`) < today;

                    return (
                        <Entry
                            key={entry.id}
                            initial={entry.issuer || entry.name}
                            title={entry.name}
                            sub={entry.issuer}
                            meta={
                                entry.expiryDate ? (
                                    <span
                                        className={`profile-badge ${expired ? 'is-warning' : ''}`}
                                    >
                                        {expired
                                            ? `Expired ${entry.expiryDate}`
                                            : `Valid until ${entry.expiryDate}`}
                                    </span>
                                ) : (
                                    <p className="profile-entry-dates">
                                        No expiry recorded
                                    </p>
                                )
                            }
                            actions={
                                <EntryActions
                                    testId={entry.id}
                                    label={entry.name}
                                    onEdit={() =>
                                        setEditingId(
                                            editingId === entry.id
                                                ? null
                                                : entry.id,
                                        )
                                    }
                                    onRemove={() =>
                                        removeCertification(entry.id)
                                    }
                                />
                            }
                        >
                            {editingId === entry.id && (
                                <CertificationForm
                                    entry={entry}
                                    onCancel={() => setEditingId(null)}
                                    onSave={(next) => {
                                        updateCertification(entry.id, next);
                                        setEditingId(null);
                                    }}
                                />
                            )}
                        </Entry>
                    );
                })}
            </ul>
        </Section>
    );
}

function CertificationForm({
    entry,
    onSave,
    onCancel,
}: {
    entry: ResumeCertification;
    onSave: (entry: ResumeCertification) => void;
    onCancel: () => void;
}) {
    const [draft, setDraft] = useState(entry);
    const [errors, setErrors] = useState<FieldErrors>({});

    const validate = (): FieldErrors => {
        const found: FieldErrors = {};
        if (!draft.name.trim()) found.name = 'Enter the certificate name.';
        if (!draft.issuer.trim()) found.issuer = 'Enter who issued it.';
        if (
            draft.issueDate &&
            draft.expiryDate &&
            draft.expiryDate < draft.issueDate
        ) {
            found.expiryDate = 'The expiry cannot be before the issue date.';
        }
        if (
            draft.credentialUrl.trim() &&
            !/^https?:\/\/\S+\.\S+/i.test(draft.credentialUrl.trim())
        ) {
            found.credentialUrl = 'Enter a full link starting with https://';
        }

        return found;
    };

    return (
        <FormShell
            onSave={() => {
                const found = validate();
                setErrors(found);
                if (Object.keys(found).length === 0) {
                    onSave({
                        ...draft,
                        name: draft.name.trim(),
                        issuer: draft.issuer.trim(),
                        credentialUrl: draft.credentialUrl.trim(),
                    });
                }
            }}
            onCancel={onCancel}
        >
            <FormField
                label="Certificate name"
                required
                value={draft.name}
                error={errors.name}
                onChange={(name) => setDraft({ ...draft, name })}
                testId="input-cert-name"
            />
            <div className="field-row">
                <FormField
                    label="Issued by"
                    required
                    value={draft.issuer}
                    error={errors.issuer}
                    onChange={(issuer) => setDraft({ ...draft, issuer })}
                    testId="input-cert-issuer"
                />
                <FormField
                    label="Credential link"
                    type="url"
                    value={draft.credentialUrl}
                    placeholder="Optional"
                    error={errors.credentialUrl}
                    onChange={(credentialUrl) =>
                        setDraft({ ...draft, credentialUrl })
                    }
                    testId="input-cert-url"
                />
            </div>
            <div className="field-row">
                <FormField
                    label="Issued"
                    type="date"
                    value={draft.issueDate}
                    onChange={(issueDate) => setDraft({ ...draft, issueDate })}
                    testId="input-cert-issue"
                />
                <FormField
                    label="Expires"
                    type="date"
                    value={draft.expiryDate}
                    error={errors.expiryDate}
                    onChange={(expiryDate) =>
                        setDraft({ ...draft, expiryDate })
                    }
                    testId="input-cert-expiry"
                />
            </div>
        </FormShell>
    );
}

function SkillsCard() {
    const { profile, setSkills } = useApplicantProfile();

    /** `'new'` while adding, a skill's id while editing it. */
    const [editingId, setEditingId] = useState<string | null>(null);

    const editingSkill = profile.skills.find((skill) => skill.id === editingId);

    const save = (draft: ResumeSkill) => {
        setSkills(
            editingSkill
                ? profile.skills.map((skill) =>
                      skill.id === draft.id ? draft : skill,
                  )
                : [...profile.skills, draft],
        );
        setEditingId(null);
    };

    const remove = (id: string) => {
        setSkills(profile.skills.filter((skill) => skill.id !== id));

        if (editingId === id) {
            setEditingId(null);
        }
    };

    return (
        <Section
            id="skills"
            title="Skills"
            lede="Use the words a listing actually uses. 'LV switchgear' matches more openings than 'electrical work'."
            action={
                <AddButton
                    label="Add skill"
                    onClick={() => setEditingId('new')}
                    testId="button-add-skills"
                />
            }
            isEmpty={profile.skills.length === 0 && editingId === null}
            empty={
                <p>
                    No skills yet. Add the ones you would be happy to be
                    interviewed on.
                </p>
            }
        >
            {profile.skills.length > 0 && (
                <ul className="profile-chips">
                    {profile.skills.map((skill) => (
                        <li className="profile-chip" key={skill.id}>
                            <span className="profile-chip-name">
                                {skill.name}
                            </span>
                            <span
                                className="profile-skill-dots"
                                role="img"
                                aria-label={`${skill.name}: ${skill.level}`}
                            >
                                {[1, 2, 3, 4].map((dot) => (
                                    <span
                                        key={dot}
                                        className={
                                            dot <= SKILL_LEVEL_DOTS[skill.level]
                                                ? 'is-on'
                                                : ''
                                        }
                                        aria-hidden="true"
                                    />
                                ))}
                            </span>
                            <span
                                className="profile-chip-level"
                                aria-hidden="true"
                            >
                                {skill.level}
                            </span>
                            <button
                                type="button"
                                className="profile-icon-button"
                                aria-label={`Edit ${skill.name}`}
                                aria-pressed={editingId === skill.id}
                                onClick={() =>
                                    setEditingId(
                                        editingId === skill.id
                                            ? null
                                            : skill.id,
                                    )
                                }
                                data-testid={`button-edit-skill-${skill.id}`}
                            >
                                <Pencil size={13} aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                className="profile-icon-button"
                                aria-label={`Remove ${skill.name}`}
                                onClick={() => remove(skill.id)}
                                data-testid={`button-remove-skill-${skill.id}`}
                            >
                                <X size={14} aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {editingId !== null && (
                <SkillForm
                    key={editingId}
                    skill={
                        editingSkill ?? {
                            id: newEntryId(),
                            name: '',
                            level: 'Intermediate',
                        }
                    }
                    takenNames={profile.skills
                        .filter((skill) => skill.id !== editingId)
                        .map((skill) => skill.name.toLowerCase())}
                    onSave={save}
                    onCancel={() => setEditingId(null)}
                />
            )}
        </Section>
    );
}

function SkillForm({
    skill,
    takenNames,
    onSave,
    onCancel,
}: {
    skill: ResumeSkill;
    /** Lower-cased names of the applicant's other skills. */
    takenNames: string[];
    onSave: (skill: ResumeSkill) => void;
    onCancel: () => void;
}) {
    const [draft, setDraft] = useState(skill);
    const [error, setError] = useState('');

    return (
        <FormShell
            onSave={() => {
                const name = draft.name.trim();

                if (!name) {
                    setError('Enter the skill name.');
                } else if (takenNames.includes(name.toLowerCase())) {
                    setError('This skill is already on your profile.');
                } else {
                    onSave({ ...draft, name });
                }
            }}
            onCancel={onCancel}
        >
            <div className="field-row">
                <FormField
                    label="Skill"
                    required
                    value={draft.name}
                    placeholder="LV switchgear"
                    error={error}
                    onChange={(name) => setDraft({ ...draft, name })}
                    testId="input-skill-name"
                />
                <div className="field">
                    <label className="field-label" htmlFor="select-skill-level">
                        Level
                    </label>
                    <Select
                        value={draft.level}
                        onValueChange={(level) =>
                            setDraft({ ...draft, level: level as SkillLevel })
                        }
                    >
                        <SelectTrigger
                            id="select-skill-level"
                            className="w-full rounded-[4px] border-[var(--line)] bg-white px-[13px] text-[13px]! text-[var(--navy)] shadow-none focus-visible:border-[var(--teal)] focus-visible:ring-[3px] focus-visible:ring-[var(--teal)]/15 data-[size=default]:h-11"
                            data-testid="select-skill-level"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SKILL_LEVELS.map((level) => (
                                <SelectItem key={level} value={level}>
                                    {level}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </FormShell>
    );
}

/** Mirrors `StoreApplicantDocumentsRequest`. */
const DOCUMENT_TYPES = /\.(pdf|docx)$/i;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 10;

/** Files on their way to the server, and how far along the bar is. */
type Uploading = {
    names: string[];
    percent: number;
};

function DocumentsCard() {
    const { profile } = useApplicantProfile();
    const fileInput = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState<Uploading | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [fileError, setFileError] = useState('');
    const uploadButtonRef = useRef<HTMLButtonElement | null>(null);

    function chooseFiles(list: FileList | null | undefined): void {
        setDragging(false);
        const files = Array.from(list ?? []);

        if (files.length === 0) {
            return;
        }

        if (files.length > MAX_FILES_PER_UPLOAD) {
            setFileError(
                `Choose up to ${MAX_FILES_PER_UPLOAD} files at a time.`,
            );

            return;
        }

        const wrongType = files.find((file) => !DOCUMENT_TYPES.test(file.name));
        if (wrongType) {
            setFileError(`${wrongType.name} is not a PDF or DOCX file.`);

            return;
        }

        const tooLarge = files.find((file) => file.size > MAX_DOCUMENT_BYTES);
        if (tooLarge) {
            setFileError(`${tooLarge.name} is larger than 10 MB.`);

            return;
        }

        setFileError('');
        router.post(
            ApplicantProfileController.storeDocuments.url(),
            { documents: files },
            {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onStart: () =>
                    setUploading({
                        names: files.map((file) => file.name),
                        percent: 0,
                    }),
                onProgress: (progress) =>
                    setUploading((current) =>
                        current
                            ? {
                                  ...current,
                                  percent: Math.round(
                                      progress?.percentage ?? 0,
                                  ),
                              }
                            : current,
                    ),
                onError: (errors) =>
                    setFileError(
                        Object.values(errors)[0] ??
                            'Your files were not uploaded. Please try again.',
                    ),
                onFinish: () => {
                    setUploading(null);
                    uploadButtonRef.current?.focus();
                },
            },
        );
    }

    function remove(document: ResumeDocument): void {
        router.delete(
            ApplicantProfileController.destroyDocument.url(
                document.id.replace(/^doc-/, ''),
            ),
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setRemovingId(document.id),
                onFinish: () => setRemovingId(null),
                onError: () =>
                    toast.error(
                        `${document.name} was not removed. Please try again.`,
                    ),
            },
        );
    }

    const uploadLabel = uploading
        ? uploading.names.length === 1
            ? uploading.names[0]
            : `${uploading.names.length} files`
        : '';

    return (
        <Section
            id="documents"
            title="Resumé & documents"
            lede="Keep your resumé and the papers agencies ask for here, then pick them in one click each time you apply."
            action={
                <Button
                    ref={uploadButtonRef}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading !== null}
                    data-testid="button-upload-document"
                >
                    <Upload size={14} aria-hidden="true" /> Upload
                </Button>
            }
            isEmpty={false}
            onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
            }}
            onDragLeave={(event) => {
                if (
                    !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                    )
                ) {
                    setDragging(false);
                }
            }}
            onDrop={(event) => {
                event.preventDefault();
                if (uploading === null) {
                    chooseFiles(event.dataTransfer.files);
                }
            }}
            dragging={dragging}
        >
            <input
                ref={fileInput}
                type="file"
                multiple
                accept=".pdf,.docx"
                className="sr-only"
                aria-label="Upload documents"
                data-testid="input-profile-upload"
                onChange={(event) => {
                    chooseFiles(event.target.files);
                    // Cleared at once so the same file can be chosen again.
                    event.target.value = '';
                }}
            />

            {(uploading || profile.documents.length > 0) && (
                <ul className="profile-docs">
                    {uploading && (
                        <li
                            className="profile-doc"
                            data-testid="profile-upload-progress"
                        >
                            <p className="sr-only" role="status">
                                Uploading {uploadLabel} {uploading.percent}%
                            </p>
                            <span
                                className="profile-doc-icon"
                                aria-hidden="true"
                            >
                                <FileText size={18} />
                            </span>
                            <div className="min-w-0 flex-1" aria-hidden="true">
                                <p className="profile-entry-title">
                                    {uploadLabel}
                                </p>
                                <span className="apply-upload-progress mt-2">
                                    <span
                                        style={{
                                            transform: `scaleX(${uploading.percent / 100})`,
                                        }}
                                    />
                                </span>
                                <p className="profile-entry-dates">
                                    Uploading… {uploading.percent}%
                                </p>
                            </div>
                        </li>
                    )}
                    {profile.documents.map((document) => (
                        <li
                            className="profile-doc"
                            key={document.id}
                            aria-busy={removingId === document.id}
                        >
                            <span
                                className="profile-doc-icon"
                                aria-hidden="true"
                            >
                                <FileText size={18} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="profile-entry-title">
                                    {document.name}
                                </p>
                                <p className="profile-entry-dates">
                                    {document.uploadedAt} · {document.size}
                                </p>
                            </div>
                            {document.primary && (
                                <span className="profile-badge">Primary</span>
                            )}
                            <button
                                type="button"
                                className="profile-icon-button is-danger"
                                aria-label={`Remove ${document.name}`}
                                disabled={removingId !== null}
                                onClick={() => remove(document)}
                                data-testid={`button-remove-document-${document.id}`}
                            >
                                <Trash2 size={15} aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <p className="profile-drop">
                {profile.documents.length === 0
                    ? 'No documents yet — add your resumé so applying takes one click. '
                    : ''}
                Drop PDF or DOCX files here, up to 10 MB each. PDFs can also be
                picked for a listing's required documents.
            </p>

            {fileError && <FieldError>{fileError}</FieldError>}
        </Section>
    );
}

function EntryActions({
    testId,
    label,
    onEdit,
    onRemove,
}: {
    testId: string;
    label: string;
    onEdit: () => void;
    onRemove: () => void;
}) {
    return (
        <div className="profile-entry-actions">
            <button
                type="button"
                className="profile-text-button"
                onClick={onEdit}
                data-testid={`button-edit-${testId}`}
            >
                Edit
            </button>
            <button
                type="button"
                className="profile-icon-button is-danger"
                aria-label={`Remove ${label}`}
                onClick={onRemove}
                data-testid={`button-remove-${testId}`}
            >
                <Trash2 size={15} aria-hidden="true" />
            </button>
        </div>
    );
}

/** Save and cancel, shared by every inline edit form. */
function FormShell({
    children,
    onSave,
    onCancel,
}: {
    children: ReactNode;
    onSave: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="profile-form">
            <div className="apply-field-stack">{children}</div>
            <div className="profile-form-actions">
                <Button
                    type="button"
                    size="sm"
                    onClick={onSave}
                    data-testid="button-save-entry"
                >
                    Save
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    data-testid="button-cancel-entry"
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
}

function FormField({
    label,
    value,
    onChange,
    testId,
    error,
    hint,
    type = 'text',
    ...input
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    testId: string;
    error?: string;
    hint?: string;
    type?: 'text' | 'month' | 'date' | 'url' | 'tel';
} & Pick<
    InputHTMLAttributes<HTMLInputElement>,
    'placeholder' | 'required' | 'inputMode' | 'maxLength'
>) {
    const describedBy = error
        ? `${testId}-error`
        : hint
          ? `${testId}-hint`
          : undefined;

    return (
        <div className="field">
            <label className="field-label" htmlFor={testId}>
                {label}
                {input.required && <span aria-hidden="true"> *</span>}
            </label>
            <input
                {...input}
                id={testId}
                type={type}
                className="field-control"
                value={value}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                onChange={(event) => onChange(event.target.value)}
                data-testid={testId}
            />
            {error ? (
                <FieldError id={`${testId}-error`}>{error}</FieldError>
            ) : (
                hint && (
                    <p className="field-hint" id={`${testId}-hint`}>
                        {hint}
                    </p>
                )
            )}
        </div>
    );
}
