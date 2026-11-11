import { Head, Link, router, setLayoutProps } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ArrowLeft,
    ArrowRight,
    Banknote,
    BriefcaseBusiness,
    CalendarDays,
    Check,
    CircleAlert,
    CircleHelp,
    ClipboardCheck,
    Flame,
    Layers,
    MapPin,
    Phone,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useForm, type FieldErrors, type PathValue } from 'react-hook-form';
import { toast } from 'sonner';
import { JobPostDocumentsField } from '@/components/dashboard/job-post-documents-field';
import { JobLocationCombobox } from '@/components/dashboard/job-location-combobox';
import { JobPostPreviewDialog } from '@/components/dashboard/job-post-preview-dialog';
import { JobPostQuestionsField } from '@/components/dashboard/job-post-questions-field';
import { DashboardPage } from '@/components/dashboard/page';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageChipsField } from '@/components/ui/language-chips-field';
import { NumberStepper } from '@/components/ui/number-stepper';
import { PhoneField } from '@/components/ui/phone-field';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CONTRACT_LABELS,
    EDUCATION_LABELS,
    GENDER_LABELS,
} from '@/data/job-attributes';
import {
    emptyJobForm,
    createJobFormSchema,
    serverErrorField,
    toJobPostPayload,
    fromJobPostPayload,
    type JobPostFormProps,
    type JobForm,
} from '@/data/job-form';
import { buildJobPostPreview } from '@/data/job-post-preview';
import { useJobPostDuplicates } from '@/hooks/use-job-post-duplicates';
import { flashServerToast } from '@/hooks/use-flash-toast';
import { cn } from '@/lib/utils';
import { jobs } from '@/routes/dashboard';
import {
    store as storeJobPost,
    update as updateJobPost,
} from '@/routes/dashboard/jobs';
import type { ContractDuration, GenderRequirement } from '@/types/job';

const inputClass =
    'h-9 min-w-0 px-3 py-0 text-sm text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 aria-invalid:border-destructive aria-invalid:focus:border-destructive aria-invalid:focus-visible:ring-destructive/20';
const selectClass =
    'h-9 w-full min-w-0 border-[var(--line)] bg-white text-sm text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40';
const labelClass = 'text-xs font-semibold text-[var(--navy)]';
const hintClass = 'text-[11px] leading-relaxed text-[var(--slate)]';
const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

type FormStep = {
    step: number;
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    optional?: boolean;
    fields: (keyof JobForm)[];
};

const FORM_STEPS: FormStep[] = [
    {
        step: 1,
        id: 'job-section-details',
        title: 'Job details',
        description: 'What the role is, where it is based and what it pays.',
        icon: BriefcaseBusiness,
        fields: [
            'postingType',
            'jobOrderNumber',
            'employerId',
            'title',
            'categoryId',
            'subcategoryId',
            'location',
            'quantity',
            'contractDuration',
            'salaryCurrency',
            'salaryMin',
            'salaryMax',
            'closingDate',
            'description',
            'urgent',
        ],
    },
    {
        step: 2,
        id: 'job-section-requirements',
        title: 'Requirements',
        description: 'Qualifications, languages and documents candidates need.',
        icon: ClipboardCheck,
        fields: [
            'education',
            'minExperienceYears',
            'maxExperienceYears',
            'gender',
            'languages',
            'requiredDocuments',
            'otherRequirements',
            'applyInstructions',
        ],
    },
    {
        step: 3,
        id: 'job-section-screening',
        title: 'Screening questions',
        description:
            'Pre-screen candidates with a few questions at application time.',
        icon: CircleHelp,
        optional: true,
        fields: ['questions'],
    },
    {
        step: 4,
        id: 'job-section-contact',
        title: 'Contact',
        description: 'Who applicants should reach about this vacancy.',
        icon: Phone,
        optional: true,
        fields: ['contactName', 'contactEmail', 'contactPhone'],
    },
];

/** Fields whose validity depends on another field's value (cross-field zod rules). */
const DEPENDENT_FIELDS: Partial<Record<keyof JobForm, (keyof JobForm)[]>> = {
    postingType: ['jobOrderNumber'],
    categoryId: ['subcategoryId'],
    salaryCurrency: ['salaryMin', 'salaryMax'],
    salaryMin: ['salaryMax', 'salaryCurrency'],
    salaryMax: ['salaryCurrency'],
    minExperienceYears: ['maxExperienceYears'],
};

type StepStatus = {
    step: FormStep;
    filled: number;
    required: number;
    errorCount: number;
};

function JobField({
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
        <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={id} className={labelClass}>
                {label}
                {required && <span className="text-destructive"> *</span>}
            </Label>
            {children}
            {hint && !error && <p className={hintClass}>{hint}</p>}
            <InputError
                id={`${id}-error`}
                message={error}
                role="alert"
                className="mt-0"
                data-testid={`error-${id}`}
            />
        </div>
    );
}

/** A titled cluster of related fields inside a form step. */
function FieldGroup({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 border-t border-[var(--line)] pt-6 first:border-t-0 first:pt-0">
            <div className="flex flex-col gap-0.5">
                <h3 className="text-[11px] font-bold tracking-[0.08em] text-[var(--slate)] uppercase">
                    {title}
                </h3>
                {description && <p className={hintClass}>{description}</p>}
            </div>
            {children}
        </div>
    );
}

function JobFormSection({
    step,
    status,
    children,
}: {
    step: FormStep;
    status: StepStatus;
    children: ReactNode;
}) {
    const Icon = step.icon;

    return (
        <section
            id={step.id}
            aria-labelledby={`${step.id}-title`}
            className="min-w-0 scroll-mt-20 rounded-xl border border-[var(--line)] bg-white shadow-xs xl:scroll-mt-6"
            data-testid={`section-${step.step}`}
        >
            <header className="flex items-start gap-4 border-b border-[var(--line)] px-5 py-4 sm:px-6">
                <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-soft)] text-[var(--navy)]"
                    aria-hidden="true"
                >
                    <Icon className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--slate)] uppercase">
                        Step {step.step} of {FORM_STEPS.length}
                    </p>
                    <h2
                        id={`${step.id}-title`}
                        className="flex flex-wrap items-center gap-2 font-serif text-lg leading-tight font-bold text-[var(--navy-deep)]"
                    >
                        {step.title}
                        {step.optional && (
                            <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-0.5 font-sans text-[10px] font-semibold tracking-wide text-[var(--slate)] uppercase">
                                Optional
                            </span>
                        )}
                    </h2>
                    <p className="text-xs leading-relaxed text-[var(--slate)]">
                        {step.description}
                    </p>
                </div>
                <StepBadge status={status} className="hidden sm:flex" />
            </header>
            <div className="flex flex-col gap-6 p-5 sm:p-6">{children}</div>
        </section>
    );
}

function StepBadge({
    status,
    className,
}: {
    status: StepStatus;
    className?: string;
}) {
    if (status.errorCount > 0) {
        return (
            <span
                className={cn(
                    'shrink-0 items-center gap-1 rounded-full bg-[var(--danger-soft)] px-2.5 py-1 text-xs font-medium text-[var(--danger)]',
                    className,
                )}
            >
                <CircleAlert className="size-3.5" aria-hidden="true" />
                {status.errorCount} to fix
            </span>
        );
    }
    if (status.required === 0) {
        return null;
    }

    const complete = status.filled === status.required;

    return (
        <span
            className={cn(
                'shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                complete
                    ? 'bg-[var(--teal-light)] text-[var(--teal-ink)]'
                    : 'bg-[var(--surface-soft)] text-[var(--slate)]',
                className,
            )}
        >
            {complete && <Check className="size-3.5" aria-hidden="true" />}
            {status.filled}/{status.required} required
        </span>
    );
}

function StepIndicator({ status }: { status: StepStatus }) {
    const complete =
        status.errorCount === 0 &&
        status.required > 0 &&
        status.filled === status.required;

    return (
        <span
            className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                status.errorCount > 0
                    ? 'bg-[var(--danger)] text-white'
                    : complete
                      ? 'bg-[var(--teal)] text-white'
                      : 'border border-[var(--line)] bg-white text-[var(--slate)]',
            )}
            aria-hidden="true"
        >
            {status.errorCount > 0 ? (
                '!'
            ) : complete ? (
                <Check className="size-3.5" />
            ) : (
                status.step.step
            )}
        </span>
    );
}

function stepStatusLabel(status: StepStatus): string {
    if (status.errorCount > 0) {
        return `${status.errorCount} ${status.errorCount === 1 ? 'field needs' : 'fields need'} attention`;
    }
    if (status.required === 0) {
        return 'Optional';
    }
    return status.filled === status.required
        ? 'Complete'
        : `${status.filled} of ${status.required} required done`;
}

function SummaryRow({
    icon: Icon,
    label,
    value,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <Icon
                className="mt-0.5 size-4 shrink-0 text-[var(--slate)]"
                aria-hidden="true"
            />
            <div className="flex min-w-0 flex-col">
                <dt className="sr-only">{label}</dt>
                <dd
                    className={cn(
                        'text-sm',
                        value === 'Not set'
                            ? 'text-[var(--slate)] italic'
                            : 'text-[var(--navy)]',
                    )}
                >
                    {value}
                </dd>
            </div>
        </div>
    );
}

export default function DashboardNewJob(props: JobPostFormProps) {
    const { agency, categories, options, today, jobPost } = props;
    const title = jobPost ? 'Update job post' : 'Post a new job';
    setLayoutProps({
        breadcrumbs: [
            { title: 'Jobs', href: jobs() },
            { title: jobPost ? 'Update job post' : 'New Job', href: '#' },
        ],
    });
    const [publishing, setPublishing] = useState(false);
    const publishingRef = useRef(false);
    const schema = useMemo(
        () => createJobFormSchema(options, today, categories),
        [options, today, categories],
    );
    const {
        control,
        register,
        setError,
        watch,
        setValue,
        clearErrors,
        handleSubmit,
        trigger,
        formState: { errors: formErrors, isSubmitted },
    } = useForm<JobForm>({
        defaultValues: jobPost
            ? fromJobPostPayload(jobPost, categories)
            : emptyJobForm,
        resolver: zodResolver(schema),
        shouldFocusError: false,
    });
    const form = watch();
    const errors: Partial<Record<keyof JobForm, string>> = Object.fromEntries(
        Object.entries(formErrors).map(([field, error]) => [
            field,
            error?.message,
        ]),
    );
    const [reviewOpen, setReviewOpen] = useState(false);
    const focusAfterReviewClose = useRef(false);
    const formRef = useRef<HTMLFormElement>(null);
    const categoryOptions = categories;
    const selectedCategory = categories.find(
        (category) => category.id === form.categoryId,
    );
    const subCategoryOptions = selectedCategory?.subcategories ?? [];
    const selectedSubcategory = subCategoryOptions.find(
        (subCategory) => subCategory.id === form.subcategoryId,
    );
    const duplicates = useJobPostDuplicates(
        form.employerId,
        form.title,
        form.subcategoryId,
        jobPost?.id,
    );
    const previewJob = buildJobPostPreview(form, {
        agency,
        categories,
        employers: props.employers,
    });

    const requiredFilled: Partial<Record<keyof JobForm, boolean>> = {
        ...(form.postingType === 'joborder'
            ? { jobOrderNumber: form.jobOrderNumber.trim() !== '' }
            : {}),
        title: form.title.trim() !== '',
        categoryId: form.categoryId !== null,
        subcategoryId: form.subcategoryId !== null,
        location: form.location.trim() !== '',
        quantity: Number(form.quantity) > 0,
        contractDuration: Boolean(form.contractDuration),
        description: form.description.trim() !== '',
        education: Boolean(form.education),
    };
    const stepStatuses: StepStatus[] = FORM_STEPS.map((step) => {
        const required = step.fields.filter((field) => field in requiredFilled);

        return {
            step,
            required: required.length,
            filled: required.filter((field) => requiredFilled[field]).length,
            errorCount: step.fields.filter((field) => formErrors[field]).length,
        };
    });
    const totalRequired = stepStatuses.reduce(
        (sum, status) => sum + status.required,
        0,
    );
    const totalFilled = stepStatuses.reduce(
        (sum, status) => sum + status.filled,
        0,
    );
    const totalErrors = stepStatuses.reduce(
        (sum, status) => sum + status.errorCount,
        0,
    );
    const progressPercent = totalRequired
        ? Math.round((totalFilled / totalRequired) * 100)
        : 100;
    const salarySummary =
        form.salaryMin.trim() || form.salaryMax.trim()
            ? `${form.salaryCurrency} ${[form.salaryMin, form.salaryMax]
                  .map((value) => value.trim())
                  .filter(Boolean)
                  .join(' – ')}`
            : 'Not set';

    /**
     * Before the first submit, typing only clears a stale (often server)
     * error. Afterwards the field and the fields whose rules depend on it are
     * re-checked against the zod schema on every change, so an error stays
     * visible until the value is actually valid.
     */
    const setField = <K extends keyof JobForm>(field: K, value: JobForm[K]) => {
        setValue(field, value as PathValue<JobForm, K>, { shouldDirty: true });
        if (isSubmitted) {
            void trigger([field, ...(DEPENDENT_FIELDS[field] ?? [])]);
        } else {
            clearErrors(field);
        }
    };

    const changeCategory = (category: string) => {
        setField('categoryId', Number(category));
        setField('subcategoryId', null);
    };

    const focusFirstError = (
        _fieldErrors?: FieldErrors<JobForm>,
        notify = true,
    ) => {
        requestAnimationFrame(() => {
            const target = formRef.current?.querySelector<HTMLElement>(
                '[aria-invalid="true"]',
            );
            target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target?.focus({ preventScroll: true });
        });
        if (notify) toast.error('Please fix the highlighted fields.');
    };

    const publish = () =>
        handleSubmit(
            (values) => {
                if (publishingRef.current) return;
                publishingRef.current = true;
                router[jobPost ? 'put' : 'post'](
                    jobPost
                        ? updateJobPost(jobPost.id).url
                        : storeJobPost().url,
                    toJobPostPayload(values),
                    {
                        preserveScroll: true,
                        preserveState: 'errors',
                        onStart: () => setPublishing(true),
                        onError: (serverErrors) => {
                            let hasFieldErrors = false;
                            for (const [key, message] of Object.entries(
                                serverErrors,
                            )) {
                                const field = serverErrorField(key);
                                if (field) {
                                    setError(field, {
                                        type: 'server',
                                        message,
                                    });
                                    hasFieldErrors = true;
                                }
                            }
                            focusAfterReviewClose.current = hasFieldErrors;
                            setReviewOpen(false);
                        },
                        onHttpException: (response) => {
                            if (!flashServerToast(response.data))
                                toast.error(
                                    'Could not reach the server. Check your connection and try again.',
                                );
                            setReviewOpen(false);
                            return false;
                        },
                        onNetworkError: () => {
                            toast.error(
                                'Could not reach the server. Check your connection and try again.',
                            );
                            return false;
                        },
                        onFinish: () => {
                            publishingRef.current = false;
                            setPublishing(false);
                        },
                    },
                );
            },
            () => {
                focusAfterReviewClose.current = true;
                setReviewOpen(false);
                toast.error('Please fix the highlighted fields.');
            },
        )();

    const invalid = (field: keyof JobForm, id: string) => ({
        'data-field': field,
        'aria-invalid': Boolean(errors[field]),
        'aria-describedby': errors[field] ? `${id}-error` : undefined,
    });

    const formatSalaryOnBlur = (field: 'salaryMin' | 'salaryMax') => {
        if (/^\d+(?:,\d{3})*$/.test(form[field])) {
            setField(
                field,
                Number(form[field].replaceAll(',', '')).toLocaleString('en-US'),
            );
        }
    };

    return (
        <>
            <Head title={title} />
            <DashboardPage className="mx-auto w-full max-w-7xl gap-5 md:px-8">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={jobs()} data-testid="button-back-to-jobs">
                            <ArrowLeft aria-hidden="true" /> Back to jobs
                        </Link>
                    </Button>
                    <p className="text-xs text-[var(--slate)]">
                        {jobPost
                            ? `Job post #${jobPost.id}`
                            : `Posting as ${agency.name}`}
                    </p>
                </div>

                <header className="flex flex-col gap-1">
                    <h1 className="font-serif text-[28px] leading-tight font-bold tracking-[-0.02em] text-[var(--navy-deep)] sm:text-[32px]">
                        {title}
                    </h1>
                    <p className="text-sm text-[var(--slate)]">
                        {jobPost
                            ? 'Update the details of your job post. Changes go live once you save.'
                            : 'Create a clear, applicant-focused job post. You can review everything before it is published.'}
                    </p>
                </header>

                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="flex min-w-0 flex-col gap-5">
                        <nav
                            aria-label="Job post steps"
                            className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 xl:hidden"
                        >
                            {stepStatuses.map((status) => (
                                <a
                                    key={status.step.id}
                                    href={`#${status.step.id}`}
                                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] bg-white py-1 pr-3.5 pl-1 text-sm font-medium text-[var(--navy)] transition-colors hover:bg-[var(--surface-soft)] ${focusRing}`}
                                >
                                    <StepIndicator status={status} />
                                    {status.step.title}
                                    <span className="sr-only">
                                        {' '}
                                        ({stepStatusLabel(status)})
                                    </span>
                                </a>
                            ))}
                        </nav>

                        <form
                            ref={formRef}
                            id="form-new-job"
                            noValidate
                            onSubmit={handleSubmit(
                                () => setReviewOpen(true),
                                (fieldErrors) => focusFirstError(fieldErrors),
                            )}
                            className="flex w-full flex-col gap-5"
                            data-testid="form-new-job"
                        >
                            <fieldset
                                disabled={publishing}
                                className="contents"
                            >
                                <JobFormSection
                                    step={FORM_STEPS[0]}
                                    status={stepStatuses[0]}
                                >
                                    <FieldGroup
                                        title="Role"
                                        description="How this vacancy is recruited and what it is called."
                                    >
                                        <div className="flex flex-col gap-1.5">
                                            <span
                                                id="posting-type-label"
                                                className={labelClass}
                                            >
                                                Recruitment type
                                            </span>
                                            <SegmentedControl
                                                value={form.postingType}
                                                onValueChange={(value) =>
                                                    setField(
                                                        'postingType',
                                                        value,
                                                    )
                                                }
                                                options={options.recruitment_types.map(
                                                    (value) => ({
                                                        value,
                                                        label:
                                                            value === 'joborder'
                                                                ? 'Job order'
                                                                : 'Manpooling',
                                                    }),
                                                )}
                                                aria-labelledby="posting-type-label"
                                                data-testid="toggle-posting-type"
                                            />
                                            <p className={hintClass}>
                                                {form.postingType === 'joborder'
                                                    ? 'A specific, approved job order from a foreign employer.'
                                                    : 'Build a pool of qualified candidates for future job orders.'}
                                            </p>
                                        </div>
                                        <div
                                            className={cn(
                                                'grid gap-4',
                                                form.postingType ===
                                                    'joborder' &&
                                                    'sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]',
                                            )}
                                        >
                                            {form.postingType ===
                                                'joborder' && (
                                                <JobField
                                                    id="job-order-number"
                                                    label="Job order number"
                                                    required
                                                    error={
                                                        errors.jobOrderNumber
                                                    }
                                                >
                                                    <Input
                                                        id="job-order-number"
                                                        required
                                                        value={
                                                            form.jobOrderNumber
                                                        }
                                                        onChange={(event) =>
                                                            setField(
                                                                'jobOrderNumber',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="e.g. JO-2026-0184"
                                                        {...invalid(
                                                            'jobOrderNumber',
                                                            'job-order-number',
                                                        )}
                                                        className={inputClass}
                                                        data-testid="input-job-order-number"
                                                    />
                                                </JobField>
                                            )}
                                            <JobField
                                                id="job-title"
                                                label="Job title"
                                                required
                                                error={errors.title}
                                            >
                                                <Input
                                                    id="job-title"
                                                    required
                                                    value={form.title}
                                                    onChange={(event) =>
                                                        setField(
                                                            'title',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="e.g. Structural Welder"
                                                    {...invalid(
                                                        'title',
                                                        'job-title',
                                                    )}
                                                    className={inputClass}
                                                    data-testid="input-job-title"
                                                />
                                            </JobField>
                                        </div>
                                        {jobPost &&
                                            form.employerId !== null &&
                                            !props.employers.some(
                                                (employer) =>
                                                    employer.id ===
                                                    form.employerId,
                                            ) && (
                                                <JobField
                                                    id="job-employer"
                                                    label="Employer"
                                                    error={errors.employerId}
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--amber)]/50 bg-[var(--amber)]/10 px-3 py-2.5">
                                                        <p className="text-sm text-[var(--navy)]">
                                                            The saved employer
                                                            is no longer
                                                            available. Clear it
                                                            before saving.
                                                        </p>
                                                        <Button
                                                            id="job-employer"
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() =>
                                                                setField(
                                                                    'employerId',
                                                                    null,
                                                                )
                                                            }
                                                            {...invalid(
                                                                'employerId',
                                                                'job-employer',
                                                            )}
                                                        >
                                                            Clear employer
                                                        </Button>
                                                    </div>
                                                </JobField>
                                            )}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <JobField
                                                id="job-category"
                                                label="Category"
                                                required
                                                error={errors.categoryId}
                                            >
                                                <Select
                                                    value={
                                                        form.categoryId?.toString() ??
                                                        ''
                                                    }
                                                    onValueChange={
                                                        changeCategory
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="job-category"
                                                        aria-required
                                                        {...invalid(
                                                            'categoryId',
                                                            'job-category',
                                                        )}
                                                        className={selectClass}
                                                        data-testid="select-job-category-new"
                                                    >
                                                        <SelectValue placeholder="Choose a category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categoryOptions.map(
                                                            (category) => (
                                                                <SelectItem
                                                                    key={
                                                                        category.id
                                                                    }
                                                                    value={String(
                                                                        category.id,
                                                                    )}
                                                                    data-testid={`category-option-${category.name}`}
                                                                >
                                                                    {
                                                                        category.name
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </JobField>
                                            <JobField
                                                id="job-subcategory"
                                                label="Sub-category"
                                                required
                                                error={errors.subcategoryId}
                                            >
                                                <Select
                                                    value={
                                                        form.subcategoryId?.toString() ??
                                                        ''
                                                    }
                                                    onValueChange={(value) =>
                                                        setField(
                                                            'subcategoryId',
                                                            Number(value),
                                                        )
                                                    }
                                                    disabled={
                                                        !form.categoryId ||
                                                        subCategoryOptions.length ===
                                                            0
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="job-subcategory"
                                                        aria-required
                                                        {...invalid(
                                                            'subcategoryId',
                                                            'job-subcategory',
                                                        )}
                                                        className={selectClass}
                                                        data-testid="select-job-subcategory-new"
                                                    >
                                                        <SelectValue
                                                            placeholder={
                                                                form.categoryId
                                                                    ? 'Choose a sub-category'
                                                                    : 'Choose a category first'
                                                            }
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {subCategoryOptions.map(
                                                            (subCategory) => (
                                                                <SelectItem
                                                                    key={
                                                                        subCategory.id
                                                                    }
                                                                    value={String(
                                                                        subCategory.id,
                                                                    )}
                                                                    data-testid={`subcategory-option-${subCategory.name}`}
                                                                >
                                                                    {
                                                                        subCategory.name
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </JobField>
                                        </div>
                                    </FieldGroup>

                                    <FieldGroup
                                        title="Placement"
                                        description="Where the work is and how many people you are hiring."
                                    >
                                        <JobField
                                            id="job-location"
                                            label="Location"
                                            required
                                            error={errors.location}
                                        >
                                            <JobLocationCombobox
                                                id="job-location"
                                                required
                                                value={form.location}
                                                onChange={(value) =>
                                                    setField('location', value)
                                                }
                                                {...invalid(
                                                    'location',
                                                    'job-location',
                                                )}
                                                className={inputClass}
                                                data-testid="input-job-location"
                                            />
                                        </JobField>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <JobField
                                                id="job-quantity"
                                                label="Vacant positions"
                                                required
                                                error={errors.quantity}
                                            >
                                                <NumberStepper
                                                    id="job-quantity"
                                                    required
                                                    value={form.quantity}
                                                    onChange={(value) =>
                                                        setField(
                                                            'quantity',
                                                            value,
                                                        )
                                                    }
                                                    {...invalid(
                                                        'quantity',
                                                        'job-quantity',
                                                    )}
                                                    max={65535}
                                                    data-testid="input-job-quantity"
                                                />
                                            </JobField>
                                            <JobField
                                                id="job-contract"
                                                label="Job type / Duration"
                                                required
                                                error={errors.contractDuration}
                                            >
                                                <Select
                                                    value={
                                                        form.contractDuration
                                                    }
                                                    onValueChange={(value) =>
                                                        setField(
                                                            'contractDuration',
                                                            value as ContractDuration,
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="job-contract"
                                                        aria-required
                                                        {...invalid(
                                                            'contractDuration',
                                                            'job-contract',
                                                        )}
                                                        className={selectClass}
                                                        data-testid="select-job-contract"
                                                    >
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {options.contract_types.map(
                                                            (value) => (
                                                                <SelectItem
                                                                    key={value}
                                                                    value={
                                                                        value
                                                                    }
                                                                    data-testid={`contract-option-${value}`}
                                                                >
                                                                    {
                                                                        CONTRACT_LABELS[
                                                                            value
                                                                        ]
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </JobField>
                                        </div>
                                    </FieldGroup>

                                    <FieldGroup
                                        title="Pay & timeline"
                                        description="Leave the salary blank to show it as competitive."
                                    >
                                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                                            <div className="flex min-w-0 flex-col gap-1.5">
                                                <Label
                                                    htmlFor="job-salary-min"
                                                    className={labelClass}
                                                >
                                                    Monthly salary range
                                                </Label>
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <Select
                                                        value={
                                                            form.salaryCurrency
                                                        }
                                                        onValueChange={(
                                                            value,
                                                        ) =>
                                                            setField(
                                                                'salaryCurrency',
                                                                value as JobForm['salaryCurrency'],
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger
                                                            className={cn(
                                                                selectClass,
                                                                'w-24 shrink-0',
                                                            )}
                                                            aria-label="Salary currency"
                                                            {...invalid(
                                                                'salaryCurrency',
                                                                'job-salary-currency',
                                                            )}
                                                            data-testid="select-salary-currency"
                                                        >
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {options.currencies.map(
                                                                (currency) => (
                                                                    <SelectItem
                                                                        key={
                                                                            currency
                                                                        }
                                                                        value={
                                                                            currency
                                                                        }
                                                                        data-testid={`currency-option-${currency}`}
                                                                    >
                                                                        {
                                                                            currency
                                                                        }
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        id="job-salary-min"
                                                        value={form.salaryMin}
                                                        onChange={(event) =>
                                                            setField(
                                                                'salaryMin',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        onBlur={() =>
                                                            formatSalaryOnBlur(
                                                                'salaryMin',
                                                            )
                                                        }
                                                        inputMode="numeric"
                                                        placeholder="Min"
                                                        aria-label="Minimum salary"
                                                        {...invalid(
                                                            'salaryMin',
                                                            'job-salary-min',
                                                        )}
                                                        className={cn(
                                                            inputClass,
                                                            'flex-1',
                                                        )}
                                                        data-testid="input-job-salary-min"
                                                    />
                                                    <span
                                                        className="text-xs text-[var(--slate)]"
                                                        aria-hidden="true"
                                                    >
                                                        –
                                                    </span>
                                                    <Input
                                                        id="job-salary-max"
                                                        value={form.salaryMax}
                                                        onChange={(event) =>
                                                            setField(
                                                                'salaryMax',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        onBlur={() =>
                                                            formatSalaryOnBlur(
                                                                'salaryMax',
                                                            )
                                                        }
                                                        inputMode="numeric"
                                                        placeholder="Max"
                                                        aria-label="Maximum salary"
                                                        {...invalid(
                                                            'salaryMax',
                                                            'job-salary-max',
                                                        )}
                                                        className={cn(
                                                            inputClass,
                                                            'flex-1',
                                                        )}
                                                        data-testid="input-job-salary-max"
                                                    />
                                                </div>
                                                <InputError
                                                    id="job-salary-currency-error"
                                                    message={
                                                        errors.salaryCurrency
                                                    }
                                                    role="alert"
                                                    className="mt-0"
                                                />
                                                <InputError
                                                    id="job-salary-min-error"
                                                    message={errors.salaryMin}
                                                    role="alert"
                                                    className="mt-0"
                                                />
                                                <InputError
                                                    id="job-salary-max-error"
                                                    message={errors.salaryMax}
                                                    role="alert"
                                                    className="mt-0"
                                                />
                                            </div>
                                            <JobField
                                                id="job-closing-date"
                                                label="Closing date"
                                                hint="Leave blank to keep the post open until you close it."
                                                error={errors.closingDate}
                                            >
                                                <Input
                                                    id="job-closing-date"
                                                    type="date"
                                                    min={today}
                                                    {...invalid(
                                                        'closingDate',
                                                        'job-closing-date',
                                                    )}
                                                    value={form.closingDate}
                                                    onChange={(event) =>
                                                        setField(
                                                            'closingDate',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className={inputClass}
                                                    data-testid="input-job-closing-date"
                                                />
                                            </JobField>
                                        </div>
                                    </FieldGroup>

                                    <FieldGroup
                                        title="Description"
                                        description="This is the main text applicants read on the job page."
                                    >
                                        <JobField
                                            id="job-description"
                                            label="About this job"
                                            required
                                            error={errors.description}
                                        >
                                            <RichTextEditor
                                                id="job-description"
                                                value={form.description}
                                                onChange={(value) =>
                                                    setField(
                                                        'description',
                                                        value,
                                                    )
                                                }
                                                rows={8}
                                                placeholder="Describe the role, key responsibilities and what the successful applicant can expect."
                                                {...invalid(
                                                    'description',
                                                    'job-description',
                                                )}
                                                data-testid="input-job-description"
                                            />
                                        </JobField>
                                        <label
                                            htmlFor="job-urgent"
                                            className={cn(
                                                'flex w-full cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors',
                                                form.urgent
                                                    ? 'border-[var(--amber)] bg-[var(--amber)]/15'
                                                    : 'border-[var(--line)] hover:border-[var(--amber)]/60 hover:bg-[var(--amber)]/5',
                                            )}
                                        >
                                            <Checkbox
                                                id="job-urgent"
                                                checked={form.urgent}
                                                onCheckedChange={(checked) =>
                                                    setField(
                                                        'urgent',
                                                        checked === true,
                                                    )
                                                }
                                                className="mt-0.5 rounded border-[var(--amber)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 data-[state=checked]:border-[var(--amber)] data-[state=checked]:bg-[var(--amber)] data-[state=checked]:text-white"
                                                data-testid="checkbox-job-urgent"
                                            />
                                            <span className="flex-1">
                                                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--navy)]">
                                                    <Flame
                                                        className="size-3.5 text-[var(--amber-hover)]"
                                                        aria-hidden="true"
                                                    />
                                                    Mark as urgent
                                                </span>
                                                <span className="mt-0.5 block text-[11px] text-[var(--slate)]">
                                                    Adds an Urgent badge to the
                                                    job post to highlight
                                                    priority recruitment.
                                                </span>
                                            </span>
                                        </label>
                                    </FieldGroup>
                                </JobFormSection>

                                <JobFormSection
                                    step={FORM_STEPS[1]}
                                    status={stepStatuses[1]}
                                >
                                    <FieldGroup
                                        title="Qualifications"
                                        description="The baseline every applicant should meet."
                                    >
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <JobField
                                                id="job-education"
                                                label="Education level"
                                                required
                                                error={errors.education}
                                            >
                                                <Select
                                                    value={form.education}
                                                    onValueChange={(value) =>
                                                        setField(
                                                            'education',
                                                            value as JobForm['education'],
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="job-education"
                                                        aria-required
                                                        {...invalid(
                                                            'education',
                                                            'job-education',
                                                        )}
                                                        className={selectClass}
                                                        data-testid="select-job-education"
                                                    >
                                                        <SelectValue placeholder="Choose an education level" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {options.education_levels.map(
                                                            (level) => (
                                                                <SelectItem
                                                                    key={level}
                                                                    value={
                                                                        level
                                                                    }
                                                                    data-testid={`education-option-${level}`}
                                                                >
                                                                    {
                                                                        EDUCATION_LABELS[
                                                                            level
                                                                        ]
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </JobField>
                                            <div className="flex min-w-0 flex-col gap-1.5">
                                                <Label
                                                    htmlFor="job-min-experience"
                                                    className={labelClass}
                                                >
                                                    Experience (years)
                                                </Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        id="job-min-experience"
                                                        type="number"
                                                        min={0}
                                                        step={1}
                                                        inputMode="numeric"
                                                        value={
                                                            form.minExperienceYears
                                                        }
                                                        onChange={(event) =>
                                                            setField(
                                                                'minExperienceYears',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Min"
                                                        aria-label="Minimum experience in years"
                                                        {...invalid(
                                                            'minExperienceYears',
                                                            'job-min-experience',
                                                        )}
                                                        className={cn(
                                                            inputClass,
                                                            'flex-1',
                                                        )}
                                                        data-testid="input-job-min-experience"
                                                    />
                                                    <span className="text-xs text-[var(--slate)]">
                                                        to
                                                    </span>
                                                    <Input
                                                        id="job-max-experience"
                                                        type="number"
                                                        min={0}
                                                        step={1}
                                                        inputMode="numeric"
                                                        value={
                                                            form.maxExperienceYears
                                                        }
                                                        onChange={(event) =>
                                                            setField(
                                                                'maxExperienceYears',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Max"
                                                        aria-label="Maximum experience in years"
                                                        {...invalid(
                                                            'maxExperienceYears',
                                                            'job-max-experience',
                                                        )}
                                                        className={cn(
                                                            inputClass,
                                                            'flex-1',
                                                        )}
                                                        data-testid="input-job-max-experience"
                                                    />
                                                </div>
                                                <InputError
                                                    id="job-min-experience-error"
                                                    message={
                                                        errors.minExperienceYears
                                                    }
                                                    role="alert"
                                                    className="mt-0"
                                                />
                                                <InputError
                                                    id="job-max-experience-error"
                                                    message={
                                                        errors.maxExperienceYears
                                                    }
                                                    role="alert"
                                                    className="mt-0"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex min-w-0 flex-col gap-1.5">
                                            <Label
                                                id="job-gender-label"
                                                className={labelClass}
                                            >
                                                Gender requirement
                                            </Label>
                                            <SegmentedControl
                                                value={form.gender}
                                                onValueChange={(value) =>
                                                    setField('gender', value)
                                                }
                                                options={options.genders.map(
                                                    (value) => ({
                                                        value: value as GenderRequirement,
                                                        label: GENDER_LABELS[
                                                            value
                                                        ],
                                                    }),
                                                )}
                                                aria-labelledby="job-gender-label"
                                                data-testid="toggle-job-gender"
                                            />
                                        </div>
                                    </FieldGroup>

                                    <FieldGroup
                                        title="Languages"
                                        description="Add each language applicants must speak and the level needed."
                                    >
                                        <div className="flex flex-col gap-1.5">
                                            <span className="sr-only">
                                                Required languages
                                            </span>
                                            <LanguageChipsField
                                                value={form.languages}
                                                onChange={(value) =>
                                                    setField('languages', value)
                                                }
                                                options={options.languages}
                                                proficiencies={
                                                    options.proficiencies
                                                }
                                            />
                                            <div
                                                data-field="languages"
                                                tabIndex={-1}
                                                aria-invalid={Boolean(
                                                    formErrors.languages,
                                                )}
                                            >
                                                <InputError
                                                    role="alert"
                                                    message={errors.languages}
                                                />
                                                {formErrors.languages?.map?.(
                                                    (entry, index) => (
                                                        <InputError
                                                            key={index}
                                                            role="alert"
                                                            message={
                                                                entry?.language
                                                                    ?.message ??
                                                                entry
                                                                    ?.proficiency
                                                                    ?.message
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    </FieldGroup>

                                    <FieldGroup
                                        title="Required documents"
                                        description="Certificates, clearances and medical results applicants must submit. They appear on the job page as what to prepare."
                                    >
                                        <JobPostDocumentsField
                                            value={form.requiredDocuments}
                                            onChange={(documents) =>
                                                setField(
                                                    'requiredDocuments',
                                                    documents,
                                                )
                                            }
                                            error={errors.requiredDocuments}
                                        />
                                    </FieldGroup>

                                    <FieldGroup
                                        title="Additional details"
                                        description="Optional notes on extra criteria and how to apply."
                                    >
                                        <div className="flex flex-col gap-1.5">
                                            <Label
                                                htmlFor="job-other-requirements"
                                                className={labelClass}
                                            >
                                                Other requirements / Additional
                                                qualifications
                                            </Label>
                                            <p
                                                id="other-requirements-hint"
                                                className={hintClass}
                                            >
                                                Add any specific certifications,
                                                licenses, or special
                                                requirements not covered above.
                                            </p>
                                            <RichTextEditor
                                                id="job-other-requirements"
                                                value={form.otherRequirements}
                                                onChange={(value) =>
                                                    setField(
                                                        'otherRequirements',
                                                        value,
                                                    )
                                                }
                                                rows={5}
                                                {...invalid(
                                                    'otherRequirements',
                                                    'job-other-requirements',
                                                )}
                                                aria-describedby={
                                                    errors.otherRequirements
                                                        ? 'other-requirements-hint job-other-requirements-error'
                                                        : 'other-requirements-hint'
                                                }
                                                data-testid="input-job-other-requirements"
                                            />
                                            <InputError
                                                id="job-other-requirements-error"
                                                role="alert"
                                                message={
                                                    errors.otherRequirements
                                                }
                                            />
                                        </div>
                                        <JobField
                                            id="job-apply-instructions"
                                            label="How to apply / Submission instructions"
                                            hint="e.g. Bring original certificates to the interview."
                                            error={errors.applyInstructions}
                                        >
                                            <Input
                                                id="job-apply-instructions"
                                                {...invalid(
                                                    'applyInstructions',
                                                    'job-apply-instructions',
                                                )}
                                                value={form.applyInstructions}
                                                onChange={(event) =>
                                                    setField(
                                                        'applyInstructions',
                                                        event.target.value,
                                                    )
                                                }
                                                className={inputClass}
                                                data-testid="input-job-apply-instructions"
                                            />
                                        </JobField>
                                    </FieldGroup>
                                </JobFormSection>

                                <JobFormSection
                                    step={FORM_STEPS[2]}
                                    status={stepStatuses[2]}
                                >
                                    <JobPostQuestionsField
                                        control={control}
                                        register={register}
                                        setValue={setValue}
                                        errors={formErrors}
                                        options={options.answer_types}
                                    />
                                </JobFormSection>

                                <JobFormSection
                                    step={FORM_STEPS[3]}
                                    status={stepStatuses[3]}
                                >
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <JobField
                                            id="job-contact-name"
                                            label="Contact person"
                                            error={errors.contactName}
                                        >
                                            <Input
                                                id="job-contact-name"
                                                {...invalid(
                                                    'contactName',
                                                    'job-contact-name',
                                                )}
                                                value={form.contactName}
                                                onChange={(event) =>
                                                    setField(
                                                        'contactName',
                                                        event.target.value,
                                                    )
                                                }
                                                className={inputClass}
                                                data-testid="input-job-contact-name"
                                            />
                                        </JobField>
                                        <JobField
                                            id="job-contact-email"
                                            label="Contact email"
                                            error={errors.contactEmail}
                                        >
                                            <Input
                                                id="job-contact-email"
                                                type="email"
                                                value={form.contactEmail}
                                                onChange={(event) =>
                                                    setField(
                                                        'contactEmail',
                                                        event.target.value,
                                                    )
                                                }
                                                {...invalid(
                                                    'contactEmail',
                                                    'job-contact-email',
                                                )}
                                                className={inputClass}
                                                data-testid="input-job-contact-email"
                                            />
                                        </JobField>
                                    </div>
                                    <JobField
                                        id="job-contact-phone"
                                        label="Contact phone"
                                        error={errors.contactPhone}
                                    >
                                        <PhoneField
                                            {...invalid(
                                                'contactPhone',
                                                'job-contact-phone',
                                            )}
                                            value={form.contactPhone}
                                            onChange={(value) =>
                                                setField('contactPhone', value)
                                            }
                                        />
                                    </JobField>
                                </JobFormSection>
                            </fieldset>
                        </form>
                    </div>

                    <aside
                        aria-label="Job post progress and summary"
                        className="hidden min-w-0 flex-col gap-5 xl:sticky xl:top-4 xl:flex xl:max-h-[calc(100dvh-6.5rem)] xl:overflow-y-auto"
                    >
                        <section
                            aria-labelledby="job-progress-title"
                            className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-xs"
                        >
                            <div className="flex items-baseline justify-between gap-2">
                                <h2
                                    id="job-progress-title"
                                    className="font-serif text-base font-bold text-[var(--navy-deep)]"
                                >
                                    Progress
                                </h2>
                                <span className="text-xs font-medium text-[var(--slate)] tabular-nums">
                                    {progressPercent}%
                                </span>
                            </div>
                            <div
                                className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]"
                                role="progressbar"
                                aria-label="Required fields completed"
                                aria-valuemin={0}
                                aria-valuemax={totalRequired}
                                aria-valuenow={totalFilled}
                            >
                                <div
                                    className="h-full rounded-full bg-[var(--teal)] transition-[width] duration-300"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <ol className="mt-4 flex flex-col gap-1">
                                {stepStatuses.map((status) => (
                                    <li key={status.step.id}>
                                        <a
                                            href={`#${status.step.id}`}
                                            className={`-mx-2 flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--surface-soft)] ${focusRing}`}
                                        >
                                            <StepIndicator status={status} />
                                            <span className="flex min-w-0 flex-col">
                                                <span className="text-sm font-medium text-[var(--navy)]">
                                                    {status.step.title}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'text-xs',
                                                        status.errorCount > 0
                                                            ? 'text-[var(--danger)]'
                                                            : 'text-[var(--slate)]',
                                                    )}
                                                >
                                                    {stepStatusLabel(status)}
                                                </span>
                                            </span>
                                        </a>
                                    </li>
                                ))}
                            </ol>
                        </section>

                        <section
                            aria-labelledby="job-summary-title"
                            className="rounded-xl border border-[var(--line)] bg-white shadow-xs"
                        >
                            <div className="border-b border-[var(--line)] px-5 py-4">
                                <h2
                                    id="job-summary-title"
                                    className="font-serif text-base font-bold text-[var(--navy-deep)]"
                                >
                                    Listing summary
                                </h2>
                                <p className="mt-0.5 text-xs text-[var(--slate)]">
                                    Updates as you type.
                                </p>
                            </div>
                            <div className="flex flex-col gap-4 p-5">
                                <div className="flex flex-col gap-1.5">
                                    <p
                                        className={cn(
                                            'text-base leading-snug font-semibold wrap-anywhere',
                                            form.title.trim()
                                                ? 'text-[var(--navy-deep)]'
                                                : 'text-[var(--slate)] italic',
                                        )}
                                    >
                                        {form.title.trim() || 'Untitled job'}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--slate)]">
                                            {form.postingType === 'joborder'
                                                ? 'Job order'
                                                : 'Manpooling'}
                                        </span>
                                        {form.urgent && (
                                            <span className="rounded-full bg-[var(--amber)]/20 px-2 py-0.5 text-[11px] font-semibold text-[var(--navy)]">
                                                Urgent
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <dl className="flex flex-col gap-2.5 wrap-anywhere">
                                    <SummaryRow
                                        icon={Layers}
                                        label="Category"
                                        value={
                                            [
                                                selectedCategory?.name,
                                                selectedSubcategory?.name,
                                            ]
                                                .filter(Boolean)
                                                .join(' / ') || 'Not set'
                                        }
                                    />
                                    <SummaryRow
                                        icon={MapPin}
                                        label="Location"
                                        value={
                                            form.location.trim() || 'Not set'
                                        }
                                    />
                                    <SummaryRow
                                        icon={Banknote}
                                        label="Monthly salary"
                                        value={salarySummary}
                                    />
                                    <SummaryRow
                                        icon={Users}
                                        label="Vacancies"
                                        value={`${form.quantity} ${Number(form.quantity) === 1 ? 'position' : 'positions'} · ${CONTRACT_LABELS[form.contractDuration] ?? ''}`}
                                    />
                                    <SummaryRow
                                        icon={CalendarDays}
                                        label="Closing date"
                                        value={
                                            form.closingDate
                                                ? `Closes ${new Intl.DateTimeFormat(
                                                      'en-US',
                                                      {
                                                          month: 'short',
                                                          day: 'numeric',
                                                          year: 'numeric',
                                                      },
                                                  ).format(
                                                      new Date(
                                                          `${form.closingDate}T12:00:00`,
                                                      ),
                                                  )}`
                                                : 'Open until closed'
                                        }
                                    />
                                </dl>
                                <p className="rounded-lg bg-[var(--surface-soft)] px-3 py-2 text-[11px] leading-relaxed text-[var(--slate)]">
                                    {jobPost
                                        ? 'You will see a full preview before your changes are saved.'
                                        : 'You will see a full preview of the job page before it is published.'}
                                </p>
                            </div>
                        </section>
                    </aside>
                </div>

                <div
                    className="sticky bottom-0 z-10 -mx-4 flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-white/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8"
                    data-testid="job-action-bar"
                >
                    <div className="flex min-w-0 items-center gap-3">
                        {totalErrors > 0 ? (
                            <p
                                className="flex items-center gap-1.5 text-xs font-medium text-[var(--danger)]"
                                role="status"
                            >
                                <CircleAlert
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                {totalErrors}{' '}
                                {totalErrors === 1
                                    ? 'field needs'
                                    : 'fields need'}{' '}
                                attention
                            </p>
                        ) : (
                            <p className="text-xs text-[var(--slate)]">
                                <span className="font-semibold text-[var(--navy)] tabular-nums">
                                    {totalFilled}/{totalRequired}
                                </span>{' '}
                                required fields complete · Fields marked{' '}
                                <span className="text-destructive">*</span> are
                                required.
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-10"
                            asChild
                            data-testid="button-cancel-job"
                        >
                            <Link href={jobs()}>Cancel</Link>
                        </Button>
                        <Button
                            type="submit"
                            form="form-new-job"
                            variant="primary"
                            className="h-10 px-5"
                            data-testid="button-publish-job"
                            disabled={publishing}
                        >
                            {jobPost ? 'Review changes' : 'Review job post'}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            </DashboardPage>
            <JobPostPreviewDialog
                open={reviewOpen}
                onOpenChange={(open) => {
                    if (!publishing) setReviewOpen(open);
                }}
                job={previewJob}
                duplicates={duplicates}
                onConfirm={publish}
                confirming={publishing}
                confirmLabel={jobPost ? 'Save changes' : undefined}
                onValidationClose={() => {
                    if (!focusAfterReviewClose.current) return false;
                    focusAfterReviewClose.current = false;
                    focusFirstError(undefined, false);
                    return true;
                }}
            />
        </>
    );
}
