import {
    ArrowLeft,
    Banknote,
    Briefcase,
    Building2,
    CalendarDays,
    Clock,
    MapPin,
    TriangleAlert,
    UsersRound,
} from 'lucide-react';
import { useRef } from 'react';
import { AgencyListedByCard } from '@/components/dashboard/agency-listed-by-card';
import { ListingFactGrid } from '@/components/dashboard/listing-fact-grid';
import { ListingTag } from '@/components/dashboard/listing-tag';
import { FormattedText } from '@/components/formatted-text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { PATHWAY_LABELS } from '@/data/agency-context';
import {
    CONTRACT_LABELS,
    EDUCATION_LABELS,
    formatApplyBy,
    formatSalary,
    GENDER_LABELS,
    PROFICIENCY_PREVIEW_LABELS,
} from '@/data/job-attributes';
import type { Agency } from '@/types/agency';
import type { Job } from '@/types/job';
import type { DuplicateJobPost } from '@/data/job-form';

type JobPostPreviewDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    job: Job;
    agency?: Agency;
    duplicates: DuplicateJobPost[];
    onConfirm: () => void;
    confirming?: boolean;
    onValidationClose?: () => boolean;
};

const microLabel =
    'text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a99a6]';
const divider = 'my-5 border-t border-[var(--line)]';

/** Scrollable job post review with a separate final publication action. */
export function JobPostPreviewDialog({
    open,
    onOpenChange,
    job,
    agency,
    duplicates,
    onConfirm,
    confirming = false,
    onValidationClose,
}: JobPostPreviewDialogProps) {
    const returnFocus = useRef<HTMLElement | null>(null);
    const questions = job.questions ?? [];
    const { amount, period } = formatSalary(job.salary);
    const salary =
        job.salary === 'Competitive salary'
            ? job.salary
            : `${amount} / ${period || 'mo'}`;
    const contact = [
        [
            job.contactName,
            job.contactEmail
                ? job.contactName
                    ? `(${job.contactEmail})`
                    : job.contactEmail
                : '',
        ]
            .filter(Boolean)
            .join(' '),
        job.contactPhone,
    ]
        .filter(Boolean)
        .join(' | ');
    const experience =
        job.minExperienceYears === undefined
            ? ''
            : job.maxExperienceYears !== undefined
              ? `${job.minExperienceYears}–${job.maxExperienceYears} years (Min. ${job.minExperienceYears} yrs)`
              : `${job.minExperienceYears}+ years`;
    const requirements = [
        {
            label: 'Education',
            value: job.education ? EDUCATION_LABELS[job.education] : '',
        },
        { label: 'Experience', value: experience },
        { label: 'Gender', value: GENDER_LABELS[job.gender] },
    ].filter((fact) => fact.value);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex max-h-[calc(100vh-3rem)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl bg-white p-0 shadow-2xl sm:max-w-[780px]"
                data-testid="job-review-dialog"
                onOpenAutoFocus={() => {
                    returnFocus.current =
                        document.activeElement instanceof HTMLElement
                            ? document.activeElement
                            : null;
                }}
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    if (onValidationClose?.()) return;
                    returnFocus.current?.focus();
                }}
            >
                <header className="shrink-0 border-b border-[var(--line)] px-6 py-4 pr-12">
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold text-[var(--navy)]">
                        <span
                            className="size-2 shrink-0 rounded-full bg-[#12b76a]"
                            aria-hidden="true"
                        />
                        Review your job post
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-xs text-[var(--slate)]">
                        How applicants will see this job on OPAP Job Abroad
                    </DialogDescription>
                </header>
                <div
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8"
                    data-testid="applicant-preview"
                >
                    {duplicates.length > 0 && (
                        <div
                            className="mb-5 flex flex-col gap-1 rounded-lg border border-[var(--amber)]/40 bg-[var(--amber)]/10 px-4 py-3"
                            role="alert"
                            data-testid="duplicate-warning"
                        >
                            <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--navy)]">
                                <TriangleAlert
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                A similar job post already exists
                            </span>
                            <ul className="ml-5 list-disc text-xs text-[var(--slate)]">
                                {duplicates.map((duplicate) => (
                                    <li key={duplicate.id}>
                                        {duplicate.job_title} —{' '}
                                        {duplicate.display_status} (
                                        {duplicate.created_at?.slice(0, 10)})
                                    </li>
                                ))}
                            </ul>
                            <p className="text-xs text-[var(--slate)]">
                                Publishing anyway will create a second job post
                                for the same role.
                            </p>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <ListingTag tone="teal" icon={Building2}>
                            {PATHWAY_LABELS[job.pathway]}
                        </ListingTag>
                        <ListingTag tone="neutral">
                            {job.postingType === 'manpooling'
                                ? 'Manpooling'
                                : 'Job order'}
                        </ListingTag>
                        {job.urgent && (
                            <ListingTag tone="danger">Urgent</ListingTag>
                        )}
                    </div>
                    {job.title && (
                        <h2
                            className="mt-4 font-serif text-[30px] leading-tight font-bold tracking-tight break-words text-[var(--navy)]"
                            data-testid="preview-title"
                        >
                            {job.title}
                        </h2>
                    )}
                    {job.postingType !== 'manpooling' && job.employer && (
                        <p
                            className="mt-2 text-base font-semibold text-[#4a5d6c]"
                            data-testid="preview-company"
                        >
                            {job.employer}
                        </p>
                    )}
                    <hr className={divider} />
                    <ListingFactGrid
                        facts={[
                            {
                                label: 'Category & role',
                                icon: Briefcase,
                                value: [job.category, job.subCategory]
                                    .filter(Boolean)
                                    .join(' • '),
                            },
                            {
                                label: 'Location',
                                icon: MapPin,
                                value: job.location,
                            },
                            {
                                label: 'Salary',
                                icon: Banknote,
                                value: job.salary ? salary : '',
                            },
                            {
                                label: 'Vacancies',
                                icon: UsersRound,
                                value: job.quantity
                                    ? `${job.quantity} ${job.quantity === 1 ? 'position' : 'positions'}`
                                    : '',
                            },
                            {
                                label: 'Job type / duration',
                                icon: CalendarDays,
                                value: job.contractDuration
                                    ? CONTRACT_LABELS[job.contractDuration]
                                    : '',
                            },
                            {
                                label: 'Apply by',
                                icon: Clock,
                                value: formatApplyBy(job.closingDate),
                            },
                        ]}
                    />
                    <hr className={divider} />
                    {agency ? (
                        <AgencyListedByCard agency={agency} />
                    ) : (
                        job.agency && (
                            <Card className="gap-0 rounded-xl border-[var(--line)] bg-white p-5 shadow-none">
                                <CardContent className="px-0 font-serif text-xl font-bold text-[var(--navy)]">
                                    {job.agency}
                                </CardContent>
                            </Card>
                        )
                    )}
                    {job.description?.trim() && (
                        <section className="mt-6" aria-label="Job description">
                            <h3 className="mb-3 text-xl font-semibold text-[var(--navy)]">
                                Job Description
                            </h3>
                            <FormattedText value={job.description} />
                        </section>
                    )}
                    {(requirements.length > 0 ||
                        Boolean(job.languages?.length)) && (
                        <section aria-label="Job requirements">
                            <hr className={divider} />
                            <h3 className="mb-3 text-xl font-semibold text-[var(--navy)]">
                                Job Requirements
                            </h3>
                            <div className="rounded-xl border border-[var(--line)] bg-[#f8f9fb] p-4">
                                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    {requirements.map(({ label, value }) => (
                                        <div key={label}>
                                            <dt className={microLabel}>
                                                {label}
                                            </dt>
                                            <dd className="mt-1 text-[13px] font-semibold text-[var(--navy)]">
                                                {value}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                                {Boolean(job.languages?.length) && (
                                    <div className="mt-4 border-t border-[var(--line)] pt-4">
                                        <p className={microLabel}>Languages</p>
                                        <div className="mt-2 flex flex-col gap-2">
                                            {job.languages?.map((entry) => (
                                                <div
                                                    key={entry.language}
                                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                                                >
                                                    <span className="text-[13px] font-semibold text-[var(--navy)]">
                                                        {entry.language}
                                                    </span>
                                                    <span className="text-xs text-[var(--slate)]">
                                                        {
                                                            PROFICIENCY_PREVIEW_LABELS[
                                                                entry
                                                                    .proficiency
                                                            ]
                                                        }
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                    {job.otherRequirements?.trim() && (
                        <section
                            className="mt-4"
                            aria-label="Additional qualifications"
                        >
                            <h4 className="mb-2 text-[11px] font-semibold tracking-wide text-[var(--slate)] uppercase">
                                Additional qualifications &amp; details:
                            </h4>
                            <FormattedText
                                value={job.otherRequirements}
                                className="text-[13px]"
                            />
                        </section>
                    )}
                    {questions.length > 0 && (
                        <section aria-label="Screening questions">
                            <hr className={divider} />
                            <h3 className="mb-3 text-[13px] font-semibold text-[var(--navy)] uppercase">
                                Screening questions
                            </h3>
                            <div className="flex flex-col gap-2">
                                {questions.map((question, index) => (
                                    <div
                                        key={question.id}
                                        className="rounded-lg border border-[var(--line)] bg-[#f8f9fb] px-4 py-3"
                                    >
                                        <p className="text-[13px] font-semibold text-[var(--navy)]">
                                            {index + 1}. {question.label}
                                            <span className="ml-2 text-xs font-normal text-[var(--slate)]">
                                                {
                                                    {
                                                        yesno: 'Yes / No',
                                                        short: 'Short answer',
                                                        paragraph: 'Paragraph',
                                                    }[question.type]
                                                }
                                            </span>
                                            {question.required && (
                                                <span className="ml-2 rounded bg-[var(--teal-light)] px-2 py-0.5 text-xs">
                                                    Required
                                                </span>
                                            )}
                                        </p>
                                        {question.answer.trim() && (
                                            <p className="mt-1 text-xs whitespace-pre-line text-[var(--slate)]">
                                                Expected Answer:{' '}
                                                <span className="font-semibold text-[#1f7a4d]">
                                                    {question.answer}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    {(contact || job.applyInstructions?.trim()) && (
                        <section aria-label="Contact and instructions">
                            <hr className={divider} />
                            <h3 className="mb-3 text-base font-semibold text-[var(--navy)]">
                                Contact &amp; Instructions
                            </h3>
                            {contact && (
                                <p className="text-[13px] leading-relaxed break-words text-[#3d5365]">
                                    <strong>Employer Contact:</strong> {contact}
                                </p>
                            )}
                            {job.applyInstructions?.trim() && (
                                <p className="mt-1 text-[13px] leading-relaxed break-words text-[#3d5365]">
                                    <strong>Submission Note:</strong>{' '}
                                    {job.applyInstructions}
                                </p>
                            )}
                        </section>
                    )}
                </div>
                <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] bg-[#fbf8f1] px-6 py-4">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        data-testid="button-back-to-edit"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Back to edit
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        loading={confirming}
                        onClick={onConfirm}
                        data-testid="button-confirm-publish"
                    >
                        Confirm and publish job post
                    </Button>
                </footer>
            </DialogContent>
        </Dialog>
    );
}
