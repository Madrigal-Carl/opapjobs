import {
    BriefcaseBusiness,
    CheckCircle2,
    FileText,
    Landmark,
    PenLine,
    Sparkles,
    UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
    ApplicationAnswer,
    ApplicationDraft,
} from '@/types/application-draft';
import type { ApplicantProfile } from '@/types/applicant-profile';
import type { Job } from '@/types/job';

function SectionHeading({
    icon: Icon,
    title,
    onEdit,
    editTestId,
}: {
    icon: LucideIcon;
    title: string;
    onEdit?: () => void;
    editTestId?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
                <Icon
                    size={15}
                    className="text-[var(--teal)]"
                    aria-hidden="true"
                />
                <h4 className="font-mono text-[10px] tracking-[0.1em] text-[var(--navy)] uppercase">
                    {title}
                </h4>
            </div>
            {onEdit && (
                <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-[var(--teal)] transition hover:text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)] focus-visible:ring-offset-2"
                    data-testid={editTestId}
                >
                    <PenLine size={13} aria-hidden="true" /> Edit
                </button>
            )}
        </div>
    );
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
            <span className="block font-mono text-[9px] tracking-[0.08em] text-[var(--slate)] uppercase">
                {label}
            </span>
            <span className="mt-1 block font-semibold break-words text-[var(--ink)]">
                {value}
            </span>
        </div>
    );
}

/**
 * Step three of the apply wizard: a read-only recap grouped by section, each
 * with an Edit link back to the step that owns it.
 */
export function ReviewSubmitStep({
    job,
    profile,
    draft,
    documents,
    onEdit,
}: {
    job: Job;
    profile: ApplicantProfile;
    draft: ApplicationDraft;
    documents: { id: string; name: string }[];
    onEdit: (target: number) => void;
}) {
    const goToStep2 = () => onEdit(2);

    const selectedResumeName = draft.uploadedResume
        ? draft.uploadedResume.name
        : documents.find((document) => document.id === draft.resumeId)?.name;

    const questions = job.questions ?? [];

    return (
        <div className="space-y-8">
            <div className="rounded-md border border-[var(--teal)]/40 bg-[var(--teal-light)] px-4 py-3 text-xs leading-relaxed text-[var(--navy)]">
                <div className="flex items-center gap-2 font-bold">
                    <Sparkles
                        size={14}
                        className="text-[var(--teal)]"
                        aria-hidden="true"
                    />
                    Almost there — review everything before you submit.
                </div>
                <p className="mt-1 text-[var(--slate)]">
                    Your application goes straight to {job.agency}. You can
                    still go back and change anything at any step.
                </p>
            </div>

            <div className="border-b border-[var(--line)] pb-6">
                <SectionHeading icon={UserRound} title="Profile & contact" />
                <div className="mt-3 flex items-center gap-3 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] font-serif text-base font-bold text-white">
                        {initialsFor(profile.name)}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ink)]">
                            {profile.name}
                        </p>
                        {profile.headline && (
                            <p className="truncate text-xs text-[var(--slate)]">
                                {profile.headline}
                            </p>
                        )}
                    </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <Fact label="Email" value={profile.email} />
                    <Fact label="Phone" value={profile.phone || '—'} />
                    <div className="sm:col-span-2">
                        <Fact
                            label="Location"
                            value={profile.location || '—'}
                        />
                    </div>
                </div>
            </div>

            <div className="border-b border-[var(--line)] pb-6">
                <SectionHeading
                    icon={FileText}
                    title="Resume"
                    onEdit={goToStep2}
                    editTestId="button-edit-resume"
                />
                <div className="mt-3 flex items-center gap-3 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
                    <FileText
                        size={17}
                        className="shrink-0 text-[var(--teal)]"
                        aria-hidden="true"
                    />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ink)]">
                            {selectedResumeName ?? 'No resume selected'}
                        </p>
                        <p className="text-[11px] text-[var(--slate)]">
                            {draft.uploadedResume
                                ? `Uploaded just now · ${draft.uploadedResume.size}`
                                : 'From your resume library'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="border-b border-[var(--line)] pb-6">
                <SectionHeading
                    icon={Sparkles}
                    title="Cover letter"
                    onEdit={goToStep2}
                    editTestId="button-edit-cover-letter"
                />
                <p className="mt-3 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-[var(--ink)]">
                    {draft.coverLetter.trim() || (
                        <span className="text-[var(--slate)]">
                            No cover letter added.
                        </span>
                    )}
                </p>
            </div>

            <div className="border-b border-[var(--line)] pb-6">
                <SectionHeading
                    icon={Landmark}
                    title="Salary & availability"
                    onEdit={goToStep2}
                    editTestId="button-edit-salary"
                />
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <Fact
                        label="Expected salary"
                        value={draft.salary.trim() || '—'}
                    />
                    <Fact
                        label="Availability"
                        value={draft.availability || '—'}
                    />
                </div>
            </div>

            {questions.length > 0 && (
                <div className="border-b border-[var(--line)] pb-6">
                    <SectionHeading
                        icon={CheckCircle2}
                        title={`${job.agency} · Questions`}
                        onEdit={goToStep2}
                        editTestId="button-edit-questions"
                    />
                    <dl className="mt-3 grid gap-3">
                        {questions.map((question) => {
                            const answer: ApplicationAnswer | undefined =
                                draft.answers[question.id];
                            const display = Array.isArray(answer)
                                ? answer.join(', ')
                                : (answer ?? '');

                            return (
                                <div
                                    key={question.id}
                                    className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3"
                                >
                                    <dt className="text-xs font-semibold text-[var(--navy)]">
                                        {question.label}
                                    </dt>
                                    <dd className="mt-1 text-sm whitespace-pre-wrap text-[var(--ink)]">
                                        {display.trim() ? (
                                            display
                                        ) : (
                                            <span className="text-[var(--slate)]">
                                                Not answered
                                            </span>
                                        )}
                                    </dd>
                                </div>
                            );
                        })}
                    </dl>
                </div>
            )}

            <p className="flex items-start gap-2 text-xs leading-relaxed text-[var(--slate)]">
                <BriefcaseBusiness
                    size={13}
                    className="mt-0.5 shrink-0 text-[var(--teal)]"
                    aria-hidden="true"
                />
                Submitting sends your profile, resume and answers to{' '}
                <strong className="font-semibold text-[var(--navy)]">
                    {job.agency}
                </strong>
                . They will contact you about the next step.
            </p>
        </div>
    );
}

function initialsFor(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .slice(0, 2)
        .join('');
}
