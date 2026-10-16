import { useRef, useState, type ReactNode } from 'react';
import {
    BriefcaseBusiness,
    CheckCircle2,
    ChevronDown,
    FileText,
    Landmark,
    Sparkles,
    Upload,
} from 'lucide-react';
import {
    AVAILABILITY_OPTIONS,
    COVER_LETTER_CHIPS,
    YES_NO_OPTIONS,
} from '@/data/application-questions';
import { authLabelClasses } from '@/lib/auth-form-styles';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type {
    ApplicationAnswer,
    ApplicationDraft,
} from '@/types/application-draft';
import type { Job, JobQuestion } from '@/types/job';

function Field({
    id,
    label,
    required,
    hint,
    error,
    children,
}: {
    id: string;
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div>
            <label className={authLabelClasses} htmlFor={id}>
                {label}
                {required && (
                    <span
                        className="ml-1 text-[var(--teal)]"
                        aria-hidden="true"
                    >
                        *
                    </span>
                )}
            </label>
            {children}
            {hint && !error && (
                <p className="mt-1.5 text-xs text-[var(--slate)]">{hint}</p>
            )}
            {error && (
                <p
                    className="mt-1.5 text-xs font-medium text-red-700"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

/**
 * Step two of the apply wizard: the resume, the cover letter, salary and
 * availability, and whatever custom questions the listing asks.
 */
export function ApplicationQuestionsStep({
    job,
    documents,
    draft,
    errors,
    onPatch,
    onAnswer,
    onUploadResume,
}: {
    job: Job;
    documents: {
        id: string;
        name: string;
        uploadedAt: string;
        size: string;
        primary: boolean;
    }[];
    draft: ApplicationDraft;
    /** Validation messages from the parent, keyed the same as `draft.answers`. */
    errors: Record<string, string>;
    onPatch: (patch: Partial<ApplicationDraft>) => void;
    onAnswer: (questionId: string, value: ApplicationAnswer) => void;
    onUploadResume: (file: File) => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    const questions = job.questions ?? [];

    return (
        <div className="space-y-9">
            {/* Resume */}
            <div>
                <div className="flex items-center gap-2">
                    <FileText
                        size={15}
                        className="text-[var(--teal)]"
                        aria-hidden="true"
                    />
                    <h4 className="font-mono text-[10px] tracking-[0.1em] text-[var(--navy)] uppercase">
                        Choose your resume
                    </h4>
                </div>
                <div
                    className="mt-4 grid gap-2.5"
                    role="radiogroup"
                    aria-label="Saved resumes"
                >
                    {documents.map((document) => {
                        const isSelected = draft.resumeId === document.id;

                        return (
                            <button
                                key={document.id}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() =>
                                    onPatch({
                                        resumeId: document.id,
                                        uploadedResume: null,
                                    })
                                }
                                className={cn(
                                    'flex min-h-11 items-center gap-3 rounded-md border px-4 py-3 text-left transition',
                                    'focus-visible:ring-2 focus-visible:ring-[var(--teal)] focus-visible:ring-offset-2',
                                    isSelected
                                        ? 'border-[var(--teal)] bg-[var(--teal-light)]'
                                        : 'border-[var(--line)] bg-[var(--surface-soft)] hover:border-[var(--teal)]',
                                )}
                                data-testid={`option-resume-${document.id}`}
                            >
                                <FileText
                                    size={17}
                                    className="shrink-0 text-[var(--teal)]"
                                    aria-hidden="true"
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                                        {document.name}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] text-[var(--slate)]">
                                        Uploaded {document.uploadedAt} ·{' '}
                                        {document.size}
                                        {document.primary ? ' · Primary' : ''}
                                    </span>
                                </span>
                                {isSelected && (
                                    <CheckCircle2
                                        size={18}
                                        className="shrink-0 text-[var(--teal)]"
                                        aria-hidden="true"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div
                    className={cn(
                        'mt-3 rounded-md border border-dashed px-4 py-6 text-center transition',
                        dragOver
                            ? 'border-[var(--teal)] bg-[var(--teal-light)]'
                            : 'border-[var(--line)] bg-[var(--surface-soft)]',
                    )}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setDragOver(false);
                        const file = event.dataTransfer.files?.[0];

                        if (file) {
                            onUploadResume(file);
                        }
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="sr-only"
                        onChange={(event) => {
                            const file = event.target.files?.[0];

                            if (file) {
                                onUploadResume(file);
                            }
                        }}
                        data-testid="input-upload-resume"
                    />
                    <Button
                        type="button"
                        variant="link"
                        className="min-h-11"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-upload-resume"
                    >
                        <Upload aria-hidden="true" />
                        Upload a new resume
                    </Button>
                    <p className="-mt-1 text-[11px] text-[var(--slate)]">
                        PDF, DOC or DOCX — or drop a file anywhere here.
                    </p>
                    {draft.uploadedResume && (
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--teal)]/30 bg-[var(--teal-light)] px-3 py-1 text-xs font-semibold text-[var(--navy)]">
                            <CheckCircle2
                                size={13}
                                className="text-[var(--teal)]"
                                aria-hidden="true"
                            />
                            {draft.uploadedResume.name} ·{' '}
                            {draft.uploadedResume.size}
                        </p>
                    )}
                </div>
                {errors.resume && (
                    <p
                        className="mt-1.5 text-xs font-medium text-red-700"
                        role="alert"
                        data-testid="text-error-resume"
                    >
                        {errors.resume}
                    </p>
                )}
            </div>

            {/* Cover letter */}
            <div>
                <div className="flex items-center gap-2">
                    <Sparkles
                        size={15}
                        className="text-[var(--teal)]"
                        aria-hidden="true"
                    />
                    <h4 className="font-mono text-[10px] tracking-[0.1em] text-[var(--navy)] uppercase">
                        Cover letter
                    </h4>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    {COVER_LETTER_CHIPS.map((chip) => (
                        <button
                            key={chip.label}
                            type="button"
                            onClick={() =>
                                onPatch({
                                    coverLetter: draft.coverLetter.trim()
                                        ? `${draft.coverLetter.trimEnd()} ${chip.snippet}`
                                        : chip.snippet,
                                })
                            }
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-xs font-medium text-[var(--slate)] transition hover:border-[var(--teal)] hover:text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)] focus-visible:ring-offset-2"
                            data-testid={`button-cover-prompt-${chip.slug}`}
                        >
                            + {chip.label}
                        </button>
                    ))}
                </div>
                <div className="mt-3">
                    <Textarea
                        id="cover-letter"
                        rows={7}
                        aria-invalid={Boolean(errors.coverLetter)}
                        className="min-h-40 resize-y"
                        value={draft.coverLetter}
                        onChange={(event) =>
                            onPatch({ coverLetter: event.target.value })
                        }
                        placeholder="Introduce yourself and explain why you're a strong fit for this role."
                        data-testid="textarea-cover-letter"
                    />
                    <p className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--slate)]">
                        {errors.coverLetter ? (
                            <span
                                className="font-medium text-red-700"
                                role="alert"
                                data-testid="text-error-cover-letter"
                            >
                                {errors.coverLetter}
                            </span>
                        ) : (
                            <span>Required</span>
                        )}
                        <span>{wordCount(draft.coverLetter)} words</span>
                    </p>
                </div>
            </div>

            {/* Salary + availability */}
            <div className="grid gap-5">
                <Field
                    id="salary-expectation"
                    label="Expected salary"
                    required
                    hint="Roughly what you are looking for in this role."
                    error={errors.salary}
                >
                    <div className="relative">
                        <Landmark
                            size={16}
                            className="absolute top-1/2 left-4 -translate-y-1/2 text-[var(--teal)]"
                            aria-hidden="true"
                        />
                        <Input
                            id="salary-expectation"
                            className="pl-11"
                            aria-invalid={Boolean(errors.salary)}
                            value={draft.salary}
                            onChange={(event) =>
                                onPatch({ salary: event.target.value })
                            }
                            placeholder="e.g. USD 3,500 / month"
                            data-testid="input-salary"
                        />
                    </div>
                </Field>

                <Field
                    id="availability"
                    label="Availability"
                    required
                    error={errors.availability}
                >
                    <div className="relative">
                        <select
                            id="availability"
                            className="w-full appearance-none rounded-md border border-[var(--line)] bg-white py-3 pr-10 pl-4 text-sm text-[var(--ink)] transition outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal)]/20"
                            value={draft.availability}
                            onChange={(event) =>
                                onPatch({ availability: event.target.value })
                            }
                            aria-invalid={Boolean(errors.availability)}
                            data-testid="select-availability"
                        >
                            <option value="">Select when you can start</option>
                            {AVAILABILITY_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[var(--teal)]"
                            size={16}
                            aria-hidden="true"
                        />
                    </div>
                </Field>
            </div>

            {/* Custom questions from the listing */}
            {questions.length > 0 && (
                <div>
                    <div className="flex items-center gap-2">
                        <BriefcaseBusiness
                            size={15}
                            className="text-[var(--teal)]"
                            aria-hidden="true"
                        />
                        <h4 className="font-mono text-[10px] tracking-[0.1em] text-[var(--navy)] uppercase">
                            {job.agency} · Questions
                        </h4>
                    </div>
                    <div className="mt-4 grid gap-6">
                        {questions.map((question) => (
                            <QuestionField
                                key={question.id}
                                question={question}
                                answer={draft.answers[question.id]}
                                error={errors[question.id]}
                                onAnswer={(value) =>
                                    onAnswer(question.id, value)
                                }
                            />
                        ))}
                    </div>
                </div>
            )}

            <p className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-xs leading-relaxed text-[var(--slate)]">
                Your answers are shared only with{' '}
                <strong className="font-semibold text-[var(--navy)]">
                    {job.agency}
                </strong>{' '}
                to evaluate this application. Required fields are marked with{' '}
                <span className="text-[var(--teal)]" aria-hidden="true">
                    *
                </span>
                .
            </p>
        </div>
    );
}

function QuestionField({
    question,
    answer,
    error,
    onAnswer,
}: {
    question: JobQuestion;
    answer: ApplicationAnswer | undefined;
    error?: string;
    onAnswer: (value: ApplicationAnswer) => void;
}) {
    if (question.type === 'yesno') {
        return (
            <fieldset>
                <legend className={authLabelClasses}>
                    {question.label}
                    {question.required && (
                        <span
                            className="ml-1 text-[var(--teal)]"
                            aria-hidden="true"
                        >
                            *
                        </span>
                    )}
                </legend>
                <div className="flex flex-wrap gap-2">
                    {YES_NO_OPTIONS.map((option) => {
                        const isSelected = answer === option;

                        return (
                            <button
                                key={option}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => onAnswer(option)}
                                className={cn(
                                    'inline-flex min-h-11 items-center gap-2.5 rounded-md border px-4 text-sm font-semibold transition',
                                    'focus-visible:ring-2 focus-visible:ring-[var(--teal)] focus-visible:ring-offset-2',
                                    isSelected
                                        ? 'border-[var(--teal)] bg-[var(--teal-light)] text-[var(--navy)]'
                                        : 'border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink)] hover:border-[var(--teal)]',
                                )}
                                data-testid={`option-${question.id}-${option}`}
                            >
                                <span
                                    className={cn(
                                        'h-3.5 w-3.5 shrink-0 rounded-full border-2',
                                        isSelected
                                            ? 'border-[var(--teal)] bg-[var(--teal)]'
                                            : 'border-[var(--line)] bg-white',
                                    )}
                                    aria-hidden="true"
                                />
                                {option}
                            </button>
                        );
                    })}
                </div>
                {error && (
                    <p
                        className="mt-1.5 text-xs font-medium text-red-700"
                        role="alert"
                        data-testid={`text-error-${question.id}`}
                    >
                        {error}
                    </p>
                )}
            </fieldset>
        );
    }

    if (question.type === 'paragraph') {
        return (
            <Field
                id={`question-${question.id}`}
                label={question.label}
                required={question.required}
                error={error}
            >
                <Textarea
                    id={`question-${question.id}`}
                    rows={4}
                    className="min-h-28 resize-y"
                    aria-invalid={Boolean(error)}
                    value={typeof answer === 'string' ? answer : ''}
                    onChange={(event) => onAnswer(event.target.value)}
                    data-testid={`input-${question.id}`}
                />
            </Field>
        );
    }

    return (
        <Field
            id={`question-${question.id}`}
            label={question.label}
            required={question.required}
            error={error}
        >
            <Input
                id={`question-${question.id}`}
                aria-invalid={Boolean(error)}
                value={typeof answer === 'string' ? answer : ''}
                onChange={(event) => onAnswer(event.target.value)}
                placeholder="A short line is enough."
                data-testid={`input-${question.id}`}
            />
        </Field>
    );
}

function wordCount(value: string): number {
    const trimmed = value.trim();

    return trimmed ? trimmed.split(/\s+/).length : 0;
}
