import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ApplicationDraftRecord } from '@/data/application-draft-store';
import type { ResumeDocument } from '@/types/applicant-profile';
import type { JobQuestion } from '@/types/job';

export function ReviewStep({
    draft,
    questions,
    jobTitle,
    agency,
    documents,
    onEditSection,
}: {
    draft: ApplicationDraftRecord;
    questions: JobQuestion[];
    jobTitle: string;
    agency: string;
    documents: ResumeDocument[];
    onEditSection: (id: string) => void;
}) {
    const resumeName =
        draft.uploadedResume?.name ||
        documents.find((item) => item.id === draft.resumeId)?.name ||
        '';
    return (
        <div className="apply-card">
            <h2 tabIndex={-1}>Review and submit</h2>
            <p className="apply-card-lede">
                This is what {agency} will see for {jobTitle}. Check it once
                more — after submitting, you can only withdraw.
            </p>
            <div className="apply-review-sections">
                <ReviewSection
                    title="Resume and cover letter"
                    target="apply-resume"
                    onEdit={onEditSection}
                >
                    <ReviewRow label="Resume" value={resumeName} required />
                    <ReviewRow label="Cover letter" value={draft.coverLetter} />
                </ReviewSection>
                <ReviewSection
                    title="Q&A"
                    target={
                        questions.length
                            ? `question-${questions.find((question) => question.required)?.id ?? questions[0].id}`
                            : 'apply-details'
                    }
                    onEdit={onEditSection}
                >
                    {questions.map((question, index) => (
                        <ReviewRow
                            key={question.id}
                            label={question.label}
                            number={index + 1}
                            value={
                                typeof draft.answers[question.id] === 'string'
                                    ? (draft.answers[question.id] as string)
                                    : ((
                                          draft.answers[question.id] as
                                              | string[]
                                              | undefined
                                      )?.join(', ') ?? '')
                            }
                            required={question.required}
                        />
                    ))}
                    <ReviewRow label="Expected salary" value={draft.salary} />
                    <ReviewRow
                        label="Availability"
                        value={draft.availability}
                    />
                </ReviewSection>
            </div>
            <p className="apply-card-lede">
                By submitting you confirm the details above are yours and agree
                that the agency may share them with the hiring employer.
            </p>
        </div>
    );
}

function ReviewSection({
    title,
    target,
    onEdit,
    children,
}: {
    title: string;
    target: string;
    onEdit: (id: string) => void;
    children: ReactNode;
}) {
    return (
        <section className="apply-review-section" aria-label={title}>
            <div className="apply-group-heading">
                <h3>{title}</h3>
                <a
                    href={`#${target}`}
                    className="review-edit"
                    onClick={(event) => {
                        event.preventDefault();
                        onEdit(target);
                    }}
                    data-testid={`button-review-edit-${title.toLowerCase().replaceAll(' ', '-')}`}
                    aria-label={`Edit ${title.toLowerCase()}`}
                >
                    Edit
                </a>
            </div>
            {children}
        </section>
    );
}

function ReviewRow({
    label,
    value,
    required = false,
    number,
}: {
    label: string;
    value: string;
    required?: boolean;
    number?: number;
}) {
    const empty = !value.trim();
    return (
        <div
            className={`apply-review-row ${empty && required ? 'is-missing' : ''}`}
        >
            <p className="apply-review-label">
                {number && (
                    <span className="apply-question-number">Q{number}</span>
                )}
                {label}
            </p>
            <p
                className={`review-value ${empty ? 'is-empty' : ''}`}
                data-testid={`review-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}
            >
                {empty ? (
                    required ? (
                        <>
                            <TriangleAlert size={16} aria-hidden="true" />{' '}
                            Required — not provided
                        </>
                    ) : (
                        'Not provided'
                    )
                ) : (
                    value.trim()
                )}
            </p>
        </div>
    );
}
