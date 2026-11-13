import { Head, Link } from '@inertiajs/react';
import {
    Award,
    BriefcaseBusiness,
    CircleCheck,
    FileText,
    GraduationCap,
    Plus,
    Sparkles,
    Trash2,
    Upload,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ApplicantScope } from '@/components/applicant/applicant-scope';
import { toast } from '@/components/ui/sonner';
import { Textarea } from '@/components/ui/textarea';
import { useApplicantProfile } from '@/contexts/applicant-profile-context';
import {
    countLabel,
    formatFileSize,
    newEntryId,
    resumeCompleteness,
} from '@/data/applicant-profile';
import { applications } from '@/routes';
import { index as jobsIndex } from '@/routes/jobs';
import {
    SKILL_LEVELS,
    SKILL_LEVEL_DOTS,
    type ResumeCertification,
    type ResumeEducation,
    type ResumeExperience,
    type ResumeSkill,
    type SkillLevel,
} from '@/types/applicant-profile';

/**
 * The sections an applicant fills in, in the order they should.
 *
 * Completeness counts a section as done only when it holds at least one
 * entry, so the meter at the top always points at the same thing the
 * applicant is about to read.
 */
const SECTIONS = [
    { id: 'summary', label: 'Summary' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'skills', label: 'Skills' },
    { id: 'documents', label: 'Documents' },
] as const;

/**
 * The resume editor.
 *
 * This is the page the match report and the apply wizard both read, so it
 * deliberately shows the same fields they do rather than a prettier
 * subset: an applicant should never be told to add something here that the
 * wizard will not send.
 */
export default function ResumeEditor() {
    return (
        <ApplicantScope>
            <ResumeEditorBody />
        </ApplicantScope>
    );
}

function ResumeEditorBody() {
    const { profile } = useApplicantProfile();

    const completeness = resumeCompleteness(profile);

    return (
        <>
            <Head>
                <title>
                    {`Your Resume — ${completeness}% complete | OPAP Job Abroad`}
                </title>
            </Head>

            <section className="resume-hero">
                <div className="shell resume-hero-inner">
                    <div>
                        <div className="eyebrow eyebrow-light">
                            <span className="eyebrow-rule" /> YOUR RESUME
                        </div>
                        <h1>
                            The one place
                            <br />
                            <em>everything is kept.</em>
                        </h1>
                    </div>
                    <p>
                        Every application you send is built from this page, so
                        there is nothing to retype. Fill in a section once and
                        the agency reads the same version.
                    </p>
                </div>
            </section>

            <section className="resume-section">
                <div className="shell">
                    <div className="resume-columns">
                        <div>
                            <ProfileCard />
                            <SummaryCard />
                            <ExperienceCard />
                            <EducationCard />
                            <CertificationCard />
                            <SkillsCard />
                            <DocumentsCard />
                        </div>

                        <aside className="resume-rail">
                            <div className="resume-rail-card">
                                <p className="resume-rail-title">
                                    How complete this is
                                </p>
                                <div className="resume-completeness">
                                    <div
                                        className="match-track"
                                        role="progressbar"
                                        aria-valuenow={completeness}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-label="Resume completeness"
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
                                    <span className="resume-completeness-value">
                                        {completeness}%
                                    </span>
                                </div>
                                <ul className="resume-checklist">
                                    {SECTIONS.map((section) => (
                                        <SectionCheck
                                            key={section.id}
                                            id={section.id}
                                        />
                                    ))}
                                </ul>
                            </div>

                            <div className="resume-rail-card">
                                <p className="resume-rail-title">
                                    Where this is used
                                </p>
                                <p className="field-hint">
                                    The match report on the first step of an
                                    application scores your resume against each
                                    listing, and the agency reads whatever you
                                    have here when your application arrives.
                                </p>
                                <Button asChild variant="secondary" size="sm">
                                    <a href={jobsIndex.url()}>
                                        Find a role to apply for
                                    </a>
                                </Button>
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={applications.url()}>
                                        See my applications
                                    </Link>
                                </Button>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>
        </>
    );
}

function SectionCheck({ id }: { id: (typeof SECTIONS)[number]['id'] }) {
    const { profile } = useApplicantProfile();

    const filled: Record<(typeof SECTIONS)[number]['id'], boolean> = {
        summary: profile.summary.trim().length > 0,
        experience: profile.experiences.length > 0,
        education: profile.education.length > 0,
        certifications: profile.certifications.length > 0,
        skills: profile.skills.length > 0,
        documents: profile.documents.length > 0,
    };

    const label = SECTIONS.find((section) => section.id === id)?.label ?? id;
    const isDone = filled[id];

    return (
        <li
            className={`resume-check ${isDone ? 'is-done' : ''}`}
            data-testid={`check-resume-${id}`}
        >
            {isDone ? (
                <CircleCheck size={14} aria-hidden="true" />
            ) : (
                <span className="resume-check-blank" aria-hidden="true" />
            )}
            <span>{label}</span>
            <strong>{isDone ? 'Done' : 'Empty'}</strong>
        </li>
    );
}

/** The shell every editable section shares. */
function Section({
    icon: Icon,
    title,
    lede,
    addLabel,
    onAdd,
    children,
    empty,
    count,
}: {
    icon: typeof FileText;
    title: string;
    lede: string;
    addLabel?: string;
    onAdd?: () => void;
    children: ReactNode;
    empty: string;
    count: number;
}) {
    return (
        <div className="resume-card">
            <div className="resume-card-head">
                <div className="resume-card-title">
                    <Icon size={16} aria-hidden="true" />
                    <h2>{title}</h2>
                    <span className="resume-card-count">{count}</span>
                </div>
                {onAdd && addLabel && (
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onAdd}
                        data-testid={`button-add-${title.toLowerCase()}`}
                    >
                        <Plus size={14} aria-hidden="true" /> {addLabel}
                    </Button>
                )}
            </div>
            <p className="apply-card-lede">{lede}</p>

            {count === 0 ? <p className="resume-card-empty">{empty}</p> : null}
            <div className="resume-entries">{children}</div>
        </div>
    );
}

function ProfileCard() {
    const { profile, replace } = useApplicantProfile();

    return (
        <div className="resume-card">
            <div className="resume-card-head">
                <div className="resume-card-title">
                    <Sparkles size={16} aria-hidden="true" />
                    <h2>How agencies see you</h2>
                </div>
            </div>

            <div className="resume-identity">
                {profile.avatarUrl ? (
                    <img
                        src={profile.avatarUrl}
                        alt=""
                        className="size-14 rounded-full object-cover"
                    />
                ) : (
                    <span className="resume-avatar-fallback" aria-hidden="true">
                        {profile.name.slice(0, 1)}
                    </span>
                )}
                <div>
                    <p className="resume-identity-name">{profile.name}</p>
                    <p className="resume-identity-headline">
                        {profile.headline}
                    </p>
                </div>
            </div>

            <div className="apply-field-stack">
                <div className="field-row">
                    <ProfileField
                        id="resume-phone"
                        label="Phone"
                        value={profile.phone}
                        onChange={(phone) => replace({ ...profile, phone })}
                    />
                    <ProfileField
                        id="resume-location"
                        label="Location"
                        value={profile.location}
                        onChange={(location) =>
                            replace({ ...profile, location })
                        }
                    />
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="resume-headline">
                        Headline
                    </label>
                    <input
                        id="resume-headline"
                        type="text"
                        className="field-control"
                        value={profile.headline}
                        onChange={(event) =>
                            replace({
                                ...profile,
                                headline: event.target.value,
                            })
                        }
                        data-testid="input-resume-headline"
                    />
                </div>

                <label className="apply-toggle">
                    <input
                        type="checkbox"
                        checked={profile.visibleToEmployers}
                        onChange={(event) =>
                            replace({
                                ...profile,
                                visibleToEmployers: event.target.checked,
                            })
                        }
                        data-testid="checkbox-resume-visible"
                    />
                    <span>
                        <strong>Visible to accredited agencies</strong>
                        Agencies you apply to can read this resume. Employers
                        who are not a posting agency cannot.
                    </span>
                </label>
            </div>
        </div>
    );
}

function ProfileField({
    id,
    label,
    value,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="field">
            <label className="field-label" htmlFor={id}>
                {label}
            </label>
            <input
                id={id}
                type="text"
                className="field-control"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
}

function SummaryCard() {
    const { profile, replace } = useApplicantProfile();

    return (
        <div className="resume-card">
            <div className="resume-card-head">
                <div className="resume-card-title">
                    <Sparkles size={16} aria-hidden="true" />
                    <h2>Summary</h2>
                    <span className="resume-card-count">
                        {profile.summary.trim().length > 0 ? 1 : 0}
                    </span>
                </div>
            </div>
            <p className="apply-card-lede">
                Three or four lines an agency reads first. Say what you do, how
                long you have done it, and what you are looking for.
            </p>

            <div className="field" style={{ marginTop: 18 }}>
                <label className="field-label" htmlFor="resume-summary">
                    Your summary
                </label>
                <Textarea
                    id="resume-summary"
                    className="field-control"
                    rows={5}
                    value={profile.summary}
                    placeholder="What you do, how long you have done it, what you want next."
                    onChange={(event) =>
                        replace({ ...profile, summary: event.target.value })
                    }
                    data-testid="input-resume-summary"
                />
                <p className="field-hint">
                    {profile.summary.trim().split(/\s+/).filter(Boolean).length}{' '}
                    words. Under 120 reads faster.
                </p>
            </div>
        </div>
    );
}

function ExperienceCard() {
    const { profile, addExperience, updateExperience, removeExperience } =
        useApplicantProfile();

    const [editingId, setEditingId] = useState<string | null>(null);

    return (
        <Section
            icon={BriefcaseBusiness}
            title="Experience"
            lede="Most recent first. A short description of what you actually did is worth more than a list of duties."
            addLabel="Add a role"
            onAdd={() => {
                addExperience({
                    id: newEntryId(),
                    role: '',
                    company: '',
                    start: '',
                    end: '',
                    location: '',
                    description: '',
                });
                setEditingId(null);
            }}
            count={profile.experiences.length}
            empty="No roles yet. Most agencies expect at least one."
        >
            {profile.experiences.map((entry) => (
                <div className="resume-entry" key={entry.id}>
                    <div className="resume-entry-head">
                        <div>
                            <p className="resume-entry-title">
                                {entry.role || 'Untitled role'}
                            </p>
                            <p className="resume-entry-sub">
                                {[entry.company, entry.location]
                                    .filter(Boolean)
                                    .join(' · ') || 'No company yet'}
                            </p>
                        </div>
                        <EntryActions
                            testId={entry.id}
                            onEdit={() =>
                                setEditingId(
                                    editingId === entry.id ? null : entry.id,
                                )
                            }
                            onRemove={() => {
                                removeExperience(entry.id);
                                toast('Role removed from your resume');
                            }}
                        />
                    </div>

                    <p className="resume-entry-dates">
                        {[entry.start, entry.end || 'Present']
                            .filter(Boolean)
                            .join(' — ') || 'No dates'}
                    </p>
                    {entry.description && (
                        <p className="review-answer">{entry.description}</p>
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
                </div>
            ))}
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
    const [draft, setDraft] = useState(entry);

    return (
        <FormShell onSave={() => onSave(draft)} onCancel={onCancel}>
            <div className="field-row">
                <FormField
                    label="Role"
                    value={draft.role}
                    onChange={(role) => setDraft({ ...draft, role })}
                    testId="input-exp-role"
                />
                <FormField
                    label="Company"
                    value={draft.company}
                    onChange={(company) => setDraft({ ...draft, company })}
                    testId="input-exp-company"
                />
            </div>
            <div className="field-row">
                <FormField
                    label="From"
                    value={draft.start}
                    placeholder="Mar 2021"
                    onChange={(start) => setDraft({ ...draft, start })}
                    testId="input-exp-start"
                />
                <FormField
                    label="To"
                    value={draft.end}
                    placeholder="Leave blank if current"
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

    const [editingId, setEditingId] = useState<string | null>(null);

    return (
        <Section
            icon={GraduationCap}
            title="Education"
            lede="Qualifications, licences and training that a listing may ask for by name."
            addLabel="Add a qualification"
            onAdd={() =>
                addEducation({
                    id: newEntryId(),
                    school: '',
                    degree: '',
                    field: '',
                    start: '',
                    end: '',
                })
            }
            count={profile.education.length}
            empty="No qualifications listed. Many listings ask for at least a high school certificate."
        >
            {profile.education.map((entry) => (
                <div className="resume-entry" key={entry.id}>
                    <div className="resume-entry-head">
                        <div>
                            <p className="resume-entry-title">
                                {entry.degree || 'Untitled qualification'}
                            </p>
                            <p className="resume-entry-sub">
                                {[entry.school, entry.field]
                                    .filter(Boolean)
                                    .join(' · ') || 'No school yet'}
                            </p>
                        </div>
                        <EntryActions
                            testId={entry.id}
                            onEdit={() =>
                                setEditingId(
                                    editingId === entry.id ? null : entry.id,
                                )
                            }
                            onRemove={() => removeEducation(entry.id)}
                        />
                    </div>

                    <p className="resume-entry-dates">
                        {[entry.start, entry.end].filter(Boolean).join(' — ') ||
                            'No dates'}
                    </p>

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
                </div>
            ))}
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

    return (
        <FormShell onSave={() => onSave(draft)} onCancel={onCancel}>
            <FormField
                label="School or institution"
                value={draft.school}
                onChange={(school) => setDraft({ ...draft, school })}
                testId="input-edu-school"
            />
            <div className="field-row">
                <FormField
                    label="Qualification"
                    value={draft.degree}
                    placeholder="BS Electrical Engineering"
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
                    label="From"
                    value={draft.start}
                    onChange={(start) => setDraft({ ...draft, start })}
                    testId="input-edu-start"
                />
                <FormField
                    label="To"
                    value={draft.end}
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

    const [editingId, setEditingId] = useState<string | null>(null);
    const today = new Date();

    return (
        <Section
            icon={Award}
            title="Certifications"
            lede="Safety and trade certificates. Expiry dates matter — the match report only counts ones still current."
            addLabel="Add a certificate"
            onAdd={() =>
                addCertification({
                    id: newEntryId(),
                    name: '',
                    issuer: '',
                    issueDate: '',
                    expiryDate: '',
                    credentialUrl: '',
                })
            }
            count={profile.certifications.length}
            empty="No certifications yet. Safety training is required for most landbased roles."
        >
            {profile.certifications.map((entry) => {
                const expired =
                    entry.expiryDate !== '' &&
                    new Date(`${entry.expiryDate}T23:59:59`) < today;

                return (
                    <div className="resume-entry" key={entry.id}>
                        <div className="resume-entry-head">
                            <div>
                                <p className="resume-entry-title">
                                    {entry.name || 'Untitled certificate'}
                                </p>
                                <p className="resume-entry-sub">
                                    {entry.issuer || 'No issuer yet'}
                                </p>
                            </div>
                            <EntryActions
                                testId={entry.id}
                                onEdit={() =>
                                    setEditingId(
                                        editingId === entry.id
                                            ? null
                                            : entry.id,
                                    )
                                }
                                onRemove={() => removeCertification(entry.id)}
                            />
                        </div>

                        <p className="resume-entry-dates">
                            {expired
                                ? `Expired ${entry.expiryDate}`
                                : entry.expiryDate
                                  ? `Valid until ${entry.expiryDate}`
                                  : 'No expiry recorded'}
                        </p>

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
                    </div>
                );
            })}
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

    return (
        <FormShell onSave={() => onSave(draft)} onCancel={onCancel}>
            <FormField
                label="Certificate name"
                value={draft.name}
                onChange={(name) => setDraft({ ...draft, name })}
                testId="input-cert-name"
            />
            <div className="field-row">
                <FormField
                    label="Issued by"
                    value={draft.issuer}
                    onChange={(issuer) => setDraft({ ...draft, issuer })}
                    testId="input-cert-issuer"
                />
                <FormField
                    label="Credential link"
                    value={draft.credentialUrl}
                    placeholder="Optional"
                    onChange={(credentialUrl) =>
                        setDraft({ ...draft, credentialUrl })
                    }
                    testId="input-cert-url"
                />
            </div>
            <div className="field-row">
                <FormField
                    label="Issued"
                    value={draft.issueDate}
                    placeholder="2024-05-12"
                    onChange={(issueDate) => setDraft({ ...draft, issueDate })}
                    testId="input-cert-issue"
                />
                <FormField
                    label="Expires"
                    value={draft.expiryDate}
                    placeholder="2029-05-12"
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

    const [draftName, setDraftName] = useState('');
    const [draftLevel, setDraftLevel] = useState<SkillLevel>('Intermediate');

    const add = () => {
        const name = draftName.trim();

        if (!name) {
            return;
        }

        const next: ResumeSkill[] = [
            ...profile.skills,
            { id: newEntryId(), name, level: draftLevel },
        ];

        setSkills(next);
        setDraftName('');
    };

    const changeLevel = (id: string, level: SkillLevel) =>
        setSkills(
            profile.skills.map((skill) =>
                skill.id === id ? { ...skill, level } : skill,
            ),
        );

    const remove = (id: string) =>
        setSkills(profile.skills.filter((skill) => skill.id !== id));

    return (
        <Section
            icon={Sparkles}
            title="Skills"
            lede="Use the words a listing actually uses. 'LV switchgear' matches more openings than 'electrical work'."
            count={profile.skills.length}
            empty="No skills yet. Add the ones you would be happy to be interviewed on."
        >
            <div className="resume-skill-row">
                <input
                    type="text"
                    className="field-control"
                    value={draftName}
                    placeholder="Add a skill"
                    aria-label="New skill"
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            add();
                        }
                    }}
                    data-testid="input-resume-skill"
                />
                <select
                    className="field-control"
                    value={draftLevel}
                    aria-label="Skill level"
                    onChange={(event) =>
                        setDraftLevel(event.target.value as SkillLevel)
                    }
                    data-testid="select-resume-skill-level"
                >
                    {SKILL_LEVELS.map((level) => (
                        <option key={level} value={level}>
                            {level}
                        </option>
                    ))}
                </select>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={add}
                    data-testid="button-add-skill"
                >
                    <Plus size={14} aria-hidden="true" /> Add
                </Button>
            </div>

            <div className="resume-skill-list">
                {profile.skills.map((skill) => (
                    <div className="resume-skill" key={skill.id}>
                        <span className="resume-skill-name">{skill.name}</span>
                        <span
                            className="resume-skill-dots"
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
                        <select
                            className="resume-skill-level"
                            value={skill.level}
                            aria-label={`Level for ${skill.name}`}
                            onChange={(event) =>
                                changeLevel(
                                    skill.id,
                                    event.target.value as SkillLevel,
                                )
                            }
                            data-testid={`select-skill-${skill.id}`}
                        >
                            {SKILL_LEVELS.map((level) => (
                                <option key={level} value={level}>
                                    {level}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="resume-entry-remove"
                            aria-label={`Remove ${skill.name}`}
                            onClick={() => remove(skill.id)}
                            data-testid={`button-remove-skill-${skill.id}`}
                        >
                            <Trash2 size={14} aria-hidden="true" />
                        </button>
                    </div>
                ))}
            </div>
        </Section>
    );
}

/** The document being read in, and how far along its bar is. */
type UploadingDocument = {
    name: string;
    percent: number;
};

function DocumentsCard() {
    const { profile, addDocument, removeDocument } = useApplicantProfile();
    const fileInput = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState<UploadingDocument | null>(null);
    const frame = useRef<number | null>(null);
    const settle = useRef<number | null>(null);

    // A card left behind mid-read must not keep the bar running.
    useEffect(
        () => () => {
            if (frame.current !== null) {
                cancelAnimationFrame(frame.current);
            }
            if (settle.current !== null) {
                window.clearTimeout(settle.current);
            }
        },
        [],
    );

    function commit(file: File): void {
        addDocument({
            id: newEntryId(),
            name: file.name,
            uploadedAt: new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            }),
            size: formatFileSize(file.size),
            url: '',
            primary: false,
        });
        toast(`${file.name} added to your documents`);
        setUploading(null);
    }

    /**
     * Runs the bar across the file before it lands in the list. The profile
     * keeps documents in memory only, so the duration stands in for reading
     * the file rather than for bytes going over a wire, and the last beat is
     * held until the bar's own 160ms fill has landed. Reduced motion drops
     * the ramp and keeps the confirmation.
     */
    function startUpload(file: File): void {
        const reduced = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        const duration = reduced ? 0 : 800;
        const startedAt = performance.now();

        const step = (now: number) => {
            const t =
                duration === 0 ? 1 : Math.min(1, (now - startedAt) / duration);

            setUploading({ name: file.name, percent: Math.round(t * 100) });

            if (t < 1) {
                frame.current = requestAnimationFrame(step);
                return;
            }

            settle.current = window.setTimeout(() => commit(file), 220);
        };

        frame.current = requestAnimationFrame(step);
    }

    return (
        <Section
            icon={FileText}
            title="Documents"
            lede="The file the agency receives when you apply. Keep a PDF of your resume here and pick it in one click each time."
            count={profile.documents.length}
            empty="No documents attached. The apply wizard will ask you to upload one on every role."
        >
            <input
                ref={fileInput}
                type="file"
                accept=".pdf,.doc,.docx"
                className="sr-only"
                aria-label="Upload a document"
                data-testid="input-resume-upload"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    // Cleared at once so the same file can be chosen again
                    // once this one has landed.
                    event.target.value = '';

                    if (file) {
                        startUpload(file);
                    }
                }}
            />

            <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInput.current?.click()}
                disabled={uploading !== null}
                data-testid="button-upload-document"
            >
                <Upload size={14} aria-hidden="true" /> Upload a document
            </Button>

            <div className="resume-doc-list">
                {uploading && (
                    <div
                        className="resume-entry"
                        data-testid="resume-upload-progress"
                    >
                        <p className="sr-only" role="status">
                            Uploading {uploading.name}
                        </p>
                        <div className="resume-entry-head" aria-hidden="true">
                            <div className="min-w-0 flex-1">
                                <p className="resume-entry-title">
                                    {uploading.name}
                                </p>
                                <div className="mt-2 grid gap-2">
                                    <span className="apply-upload-progress">
                                        <span
                                            style={{
                                                transform: `scaleX(${uploading.percent / 100})`,
                                            }}
                                        />
                                    </span>
                                    <p className="resume-entry-sub">
                                        Uploading… {uploading.percent}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {profile.documents.map((document) => (
                    <div className="resume-entry" key={document.id}>
                        <div className="resume-entry-head">
                            <div>
                                <p className="resume-entry-title">
                                    {document.name}
                                </p>
                                <p className="resume-entry-sub">
                                    {countLabel(1, 'file')} ·{' '}
                                    {document.uploadedAt} · {document.size}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="resume-entry-remove"
                                aria-label={`Remove ${document.name}`}
                                onClick={() => removeDocument(document.id)}
                                data-testid={`button-remove-document-${document.id}`}
                            >
                                <Trash2 size={14} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </Section>
    );
}

function EntryActions({
    testId,
    onEdit,
    onRemove,
}: {
    testId: string;
    onEdit: () => void;
    onRemove: () => void;
}) {
    return (
        <div className="resume-entry-actions">
            <button
                type="button"
                className="review-edit"
                onClick={onEdit}
                data-testid={`button-edit-${testId}`}
            >
                Edit
            </button>
            <button
                type="button"
                className="resume-entry-remove"
                aria-label="Remove this entry"
                onClick={onRemove}
                data-testid={`button-remove-${testId}`}
            >
                <Trash2 size={14} aria-hidden="true" />
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
        <div className="resume-entry-form">
            <div className="apply-field-stack">{children}</div>
            <div className="resume-entry-form-actions">
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
    placeholder,
    testId,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    testId: string;
}) {
    return (
        <div className="field">
            <label className="field-label" htmlFor={testId}>
                {label}
            </label>
            <input
                id={testId}
                type="text"
                className="field-control"
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                data-testid={testId}
            />
        </div>
    );
}
