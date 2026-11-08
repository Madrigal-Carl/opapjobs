import { CircleCheck, TriangleAlert } from 'lucide-react';
import { ApplyTag, focusApplyField } from '@/components/applicant/apply-field';
import { ApplyQuestion } from '@/components/applicant/apply-question';
import { FieldError } from '@/components/applicant/match-blocks';
import { ResumePicker } from '@/components/applicant/resume-dropzone';
import { FormSelect } from '@/components/form/form-select';
import { Textarea } from '@/components/ui/textarea';
import type { ApplicationDraftRecord } from '@/data/application-draft-store';
import {
    AVAILABILITY_OPTIONS,
    COVER_LETTER_CHIPS,
} from '@/data/application-questions';
import {
    missingRequiredAnswers,
    type ApplicationAnswer,
} from '@/types/application-draft';
import type { ResumeDocument } from '@/types/applicant-profile';
import type { JobQuestion } from '@/types/job';

export function ApplicationStepForm({
    step,
    agency,
    draft,
    questions,
    documents,
    profileName,
    blocked,
    outstanding,
    onPatch,
    onAnswer,
}: {
    step: 2 | 3;
    agency: string;
    draft: ApplicationDraftRecord;
    questions: JobQuestion[];
    documents: ResumeDocument[];
    profileName: string;
    blocked: string[];
    outstanding: string[];
    onPatch: (next: Partial<ApplicationDraftRecord>) => void;
    onAnswer: (questionId: string, value: ApplicationAnswer) => void;
}) {
    const required = questions.filter((question) => question.required);
    const optional = questions.filter((question) => !question.required);
    const missing = missingRequiredAnswers(required, draft.answers);
    const hasResume = Boolean(draft.resumeId || draft.uploadedResume?.name);
    const resumeInvalid = blocked.length > 0 && !hasResume;
    const total = step === 2 ? 1 : required.length;
    const done =
        step === 2 ? Number(hasResume) : required.length - missing.length;
    const problems = [
        ...(step === 2 && !hasResume
            ? [{ id: 'apply-resume', label: 'Choose a resume to send' }]
            : []),
        ...(step === 3 ? missing : []).map((question) => ({
            id: `question-${question.id}`,
            label: question.label,
        })),
    ];
    const questionField = (question: JobQuestion) => (
        <ApplyQuestion
            key={question.id}
            question={question}
            number={questions.indexOf(question) + 1}
            answer={draft.answers[question.id]}
            invalid={blocked.length > 0 && missing.includes(question)}
            onAnswer={onAnswer}
        />
    );

    return (
        <div
            className="apply-card apply-form"
            data-testid="form-apply-application"
        >
            <h2 tabIndex={-1}>
                {step === 2
                    ? 'Resume and cover letter'
                    : 'Questions from the employer'}
            </h2>
            <p className="apply-card-lede">
                {step === 2
                    ? `Choose the resume you’d like ${agency} to read. A cover letter is optional.`
                    : `Help ${agency} understand your experience and preferences. Fields marked * are required.`}
            </p>
            <section
                className="apply-form-group"
                aria-labelledby="apply-required-title"
            >
                <div className="apply-group-heading">
                    <h3 id="apply-required-title">
                        {step === 2 ? 'Your documents' : 'Employer questions'}
                    </h3>
                    <span data-testid="status-apply-required">
                        {done} of {total} done
                    </span>
                </div>
                {step === 2 && (
                    <fieldset
                        id="apply-resume"
                        className={`field apply-resume-field ${resumeInvalid ? 'is-invalid' : ''}`}
                    >
                        <legend className="apply-field-label">
                            Resume <ApplyTag required />
                        </legend>
                        <p className="field-hint">
                            Sending as {profileName}. Pick a document from your
                            profile, or upload one now.
                        </p>
                        <ResumePicker
                            draft={draft}
                            documents={documents}
                            invalid={resumeInvalid}
                            onPatch={onPatch}
                        />
                        {resumeInvalid && (
                            <div id="apply-resume-error">
                                <FieldError>
                                    Choose a resume before continuing.
                                </FieldError>
                            </div>
                        )}
                    </fieldset>
                )}
                {step === 3 && [...required, ...optional].map(questionField)}
                {step === 2 && (
                    <div className="field" id="apply-optional">
                        <label
                            className="apply-field-label"
                            htmlFor="apply-cover-letter"
                        >
                            Cover letter <ApplyTag />
                        </label>
                        <p className="field-hint">
                            Tell the agency why this role is right for you.
                        </p>
                        <Textarea
                            id="apply-cover-letter"
                            className="field-control"
                            rows={4}
                            value={draft.coverLetter}
                            placeholder="Why this role, and why you."
                            onChange={(event) =>
                                onPatch({ coverLetter: event.target.value })
                            }
                            data-testid="input-apply-cover-letter"
                        />
                        <div className="apply-cover-chips">
                            {COVER_LETTER_CHIPS.map((chip) => (
                                <button
                                    key={chip.slug}
                                    type="button"
                                    className="apply-chip"
                                    onClick={() =>
                                        onPatch({
                                            coverLetter: `${draft.coverLetter.trim()}${draft.coverLetter.trim() ? ' ' : ''}${chip.snippet}`,
                                        })
                                    }
                                    data-testid={`chip-apply-${chip.slug}`}
                                >
                                    + {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {step === 3 && (
                    <>
                        <div className="field" id="apply-details">
                            <label
                                className="apply-field-label"
                                htmlFor="apply-salary"
                            >
                                Expected monthly salary <ApplyTag />
                            </label>
                            <input
                                id="apply-salary"
                                type="text"
                                className="field-control"
                                value={draft.salary}
                                placeholder="Amount and currency per month"
                                onChange={(event) =>
                                    onPatch({ salary: event.target.value })
                                }
                                data-testid="input-apply-salary"
                            />
                            <p className="field-hint">
                                Leave blank to let the agency quote theirs.
                            </p>
                        </div>
                        <div className="field">
                            <label
                                className="apply-field-label"
                                htmlFor="apply-availability"
                            >
                                Availability <ApplyTag />
                            </label>
                            <FormSelect
                                id="apply-availability"
                                selectClassName="field-control"
                                placeholder="Select your availability"
                                value={draft.availability}
                                onChange={(event) =>
                                    onPatch({
                                        availability: event.target.value,
                                    })
                                }
                                options={AVAILABILITY_OPTIONS.map((option) => ({
                                    value: option,
                                    label: option,
                                }))}
                                data-testid="select-apply-availability"
                            />
                            <p className="field-hint">
                                Not sure yet? You can leave this blank.
                            </p>
                        </div>
                    </>
                )}
            </section>
            <p
                className={`apply-requirement-status ${outstanding.length === 0 ? 'is-ready' : ''}`}
                role="status"
                data-testid="status-apply-outstanding"
            >
                {outstanding.length === 0 && (
                    <CircleCheck size={16} aria-hidden="true" />
                )}
                <span>
                    {outstanding.length === 0
                        ? 'Everything required for this step is ready.'
                        : `Still needed: ${outstanding.join(' and ').toLowerCase()}.`}
                </span>
            </p>
            {blocked.length > 0 && problems.length > 0 && (
                <ul
                    className="apply-blocked-list"
                    role="alert"
                    aria-label="Complete these required fields"
                    data-testid="list-apply-blocked"
                >
                    {problems.map((problem) => (
                        <li key={problem.id}>
                            <TriangleAlert size={15} aria-hidden="true" />
                            <a
                                href={`#${problem.id}`}
                                data-testid={`link-apply-error-${problem.id}`}
                                onClick={(event) => {
                                    event.preventDefault();
                                    focusApplyField(problem.id);
                                }}
                            >
                                {problem.label}
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
