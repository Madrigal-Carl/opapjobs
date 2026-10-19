import { Head, Link, router } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ArrowLeft,
    ArrowRight,
    BriefcaseBusiness,
    Building2,
    CircleHelp,
    ClipboardCheck,
    MapPin,
} from 'lucide-react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useForm, type FieldErrors, type PathValue } from 'react-hook-form';
import { toast } from 'sonner';
import { EmployerCombobox } from '@/components/dashboard/employer-combobox';
import { FormSection } from '@/components/dashboard/form-section';
import { JobPostPreviewDialog } from '@/components/dashboard/job-post-preview-dialog';
import { JobPostQuestionsField } from '@/components/dashboard/job-post-questions-field';
import { DashboardPage } from '@/components/dashboard/page';
import { PageHeader } from '@/components/dashboard/page-header';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    type JobPostFormProps,
    type JobPostEmployer,
    type JobForm,
} from '@/data/job-form';
import { buildJobPostPreview } from '@/data/job-post-preview';
import { useJobPostDuplicates } from '@/hooks/use-job-post-duplicates';
import { flashServerToast } from '@/hooks/use-flash-toast';
import { cn } from '@/lib/utils';
import { jobs } from '@/routes/dashboard';
import { store as storeJobPost } from '@/routes/dashboard/jobs';
import { store as storeEmployer } from '@/routes/dashboard/employers';
import type { ContractDuration, GenderRequirement } from '@/types/job';

const inputClass =
    'h-9 min-w-0 px-3 py-0 text-sm text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40';
const selectClass =
    'h-9 w-full min-w-0 border-[var(--line)] bg-white text-sm text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40';
const labelClass = 'text-xs font-semibold text-[var(--navy)]';

function JobField({
    id,
    label,
    required,
    error,
    children,
}: {
    id: string;
    label: string;
    required?: boolean;
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

export default function DashboardNewJob(props: JobPostFormProps) {
    const { agency, categories, employers, options, today } = props;
    const [publishing, setPublishing] = useState(false);
    const publishingRef = useRef(false);
    const [employerSaving, setEmployerSaving] = useState(false);
    const employerSavingRef = useRef(false);
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
        formState: { errors: formErrors },
    } = useForm<JobForm>({
        defaultValues: emptyJobForm,
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
    const [employerOpen, setEmployerOpen] = useState(false);
    const [employerDraft, setEmployerDraft] = useState({
        name: '',
        location: '',
        poeaLicenseNo: '',
    });
    const [employerError, setEmployerError] = useState('');
    const [employerFieldErrors, setEmployerFieldErrors] = useState<
        Record<string, string>
    >({});
    const [createdEmployers, setCreatedEmployers] = useState<JobPostEmployer[]>(
        [],
    );
    const employerOptions = useMemo(
        () => [
            ...employers,
            ...createdEmployers.filter(
                (entry) =>
                    !employers.some((existing) => existing.id === entry.id),
            ),
        ],
        [employers, createdEmployers],
    );
    const formRef = useRef<HTMLFormElement>(null);
    const categoryOptions = categories;
    const subCategoryOptions =
        categories.find((category) => category.id === form.categoryId)
            ?.subcategories ?? [];
    const duplicates = useJobPostDuplicates(
        form.employerId,
        form.title,
        form.subcategoryId,
    );
    const previewJob = buildJobPostPreview(form, {
        agency,
        categories,
        employers: employerOptions,
    });

    const setField = <K extends keyof JobForm>(field: K, value: JobForm[K]) => {
        setValue(field, value as PathValue<JobForm, K>, { shouldDirty: true });
        clearErrors(field);
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
                router.post(storeJobPost().url, toJobPostPayload(values), {
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
                                setError(field, { type: 'server', message });
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
                });
            },
            () => {
                focusAfterReviewClose.current = true;
                setReviewOpen(false);
                toast.error('Please fix the highlighted fields.');
            },
        )();

    const saveEmployer = () => {
        const name = employerDraft.name.trim();
        const location = employerDraft.location.trim();
        const poeaLicenseNo = employerDraft.poeaLicenseNo.trim();

        if (!name || !location || !poeaLicenseNo) {
            setEmployerError(
                'Please complete the employer name, location and licence number.',
            );
            return;
        }

        if (employerSavingRef.current) return;
        employerSavingRef.current = true;
        router.post(
            storeEmployer().url,
            {
                employer_name: name,
                employer_location: location,
                employer_license_number: poeaLicenseNo,
            },
            {
                preserveState: true,
                preserveScroll: true,
                onStart: () => {
                    setEmployerSaving(true);
                    setEmployerFieldErrors({});
                },
                onFlash: (flash) => {
                    const created = flash.createdEmployer as
                        | JobPostEmployer
                        | undefined;
                    if (created) {
                        setCreatedEmployers((current) => [...current, created]);
                        setField('employerId', created.id);
                        setEmployerOpen(false);
                        setEmployerError('');
                        setEmployerDraft({
                            name: '',
                            location: '',
                            poeaLicenseNo: '',
                        });
                    }
                },
                onError: (serverErrors) => setEmployerFieldErrors(serverErrors),
                onHttpException: (response) => {
                    if (!flashServerToast(response.data))
                        toast.error(
                            'Could not reach the server. Check your connection and try again.',
                        );
                    return false;
                },
                onNetworkError: () => {
                    toast.error(
                        'Could not reach the server. Check your connection and try again.',
                    );
                    return false;
                },
                onFinish: () => {
                    employerSavingRef.current = false;
                    setEmployerSaving(false);
                },
            },
        );
    };

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
            <Head title="Post a new job" />
            <DashboardPage className="md:px-8">
                <PageHeader
                    title="Post a new job"
                    subtitle="Create a clear, applicant-focused job post for your next placement."
                    action={{
                        label: 'Back to jobs',
                        icon: ArrowLeft,
                        href: jobs().url,
                        testId: 'button-back-to-jobs',
                    }}
                />
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
                        disabled={publishing || employerSaving}
                        className="contents"
                    >
                        <FormSection
                            step={1}
                            title="Job details"
                            description="What the role is and where it is based."
                            icon={BriefcaseBusiness}
                            headerAction={
                                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-1.5">
                                    <span
                                        id="posting-type-label"
                                        className={labelClass}
                                    >
                                        Recruitment type:
                                    </span>
                                    <SegmentedControl
                                        value={form.postingType}
                                        onValueChange={(value) =>
                                            setField('postingType', value)
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
                                </div>
                            }
                        >
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
                                        setField('title', event.target.value)
                                    }
                                    {...invalid('title', 'job-title')}
                                    className={inputClass}
                                    data-testid="input-job-title"
                                />
                            </JobField>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <JobField
                                    id="job-category"
                                    label="Category"
                                    required
                                    error={errors.categoryId}
                                >
                                    <Select
                                        value={
                                            form.categoryId?.toString() ?? ''
                                        }
                                        onValueChange={changeCategory}
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
                                            {categoryOptions.map((category) => (
                                                <SelectItem
                                                    key={category.id}
                                                    value={String(category.id)}
                                                    data-testid={`category-option-${category.name}`}
                                                >
                                                    {category.name}
                                                </SelectItem>
                                            ))}
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
                                            form.subcategoryId?.toString() ?? ''
                                        }
                                        onValueChange={(value) =>
                                            setField(
                                                'subcategoryId',
                                                Number(value),
                                            )
                                        }
                                        disabled={
                                            !form.categoryId ||
                                            subCategoryOptions.length === 0
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
                                                        key={subCategory.id}
                                                        value={String(
                                                            subCategory.id,
                                                        )}
                                                        data-testid={`subcategory-option-${subCategory.name}`}
                                                    >
                                                        {subCategory.name}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                </JobField>
                            </div>
                            <JobField
                                id="job-location"
                                label="Location"
                                required
                                error={errors.location}
                            >
                                <div className="relative">
                                    <MapPin
                                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--slate)]"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id="job-location"
                                        required
                                        value={form.location}
                                        onChange={(event) =>
                                            setField(
                                                'location',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="City, Country"
                                        {...invalid('location', 'job-location')}
                                        className={cn(inputClass, 'pl-9')}
                                        data-testid="input-job-location"
                                    />
                                </div>
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
                                            setField('quantity', value)
                                        }
                                        {...invalid('quantity', 'job-quantity')}
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
                                        value={form.contractDuration}
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
                                                        value={value}
                                                        data-testid={`contract-option-${value}`}
                                                    >
                                                        {CONTRACT_LABELS[value]}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                </JobField>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
                                <div className="flex min-w-0 flex-col gap-1.5">
                                    <Label
                                        htmlFor="job-salary-min"
                                        className={labelClass}
                                    >
                                        Salary range
                                    </Label>
                                    <div className="flex min-w-0 items-center gap-2">
                                        <Select
                                            value={form.salaryCurrency}
                                            onValueChange={(value) =>
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
                                                            key={currency}
                                                            value={currency}
                                                            data-testid={`currency-option-${currency}`}
                                                        >
                                                            {currency}
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
                                                    event.target.value,
                                                )
                                            }
                                            onBlur={() =>
                                                formatSalaryOnBlur('salaryMin')
                                            }
                                            inputMode="numeric"
                                            placeholder="Min"
                                            aria-label="Minimum salary"
                                            {...invalid(
                                                'salaryMin',
                                                'job-salary-min',
                                            )}
                                            className={cn(inputClass, 'flex-1')}
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
                                                    event.target.value,
                                                )
                                            }
                                            onBlur={() =>
                                                formatSalaryOnBlur('salaryMax')
                                            }
                                            inputMode="numeric"
                                            placeholder="Max"
                                            aria-label="Maximum salary"
                                            {...invalid(
                                                'salaryMax',
                                                'job-salary-max',
                                            )}
                                            className={cn(inputClass, 'flex-1')}
                                            data-testid="input-job-salary-max"
                                        />
                                    </div>
                                    <InputError
                                        id="job-salary-currency-error"
                                        message={errors.salaryCurrency}
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
                            <JobField
                                id="job-description"
                                label="About this Job"
                                required
                                error={errors.description}
                            >
                                <RichTextEditor
                                    id="job-description"
                                    value={form.description}
                                    onChange={(value) =>
                                        setField('description', value)
                                    }
                                    rows={6}
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
                                className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-[var(--amber)]/50 bg-[var(--amber)]/10 px-3 py-2.5"
                            >
                                <Checkbox
                                    id="job-urgent"
                                    checked={form.urgent}
                                    onCheckedChange={(checked) =>
                                        setField('urgent', checked === true)
                                    }
                                    className="mt-0.5 rounded border-[var(--amber)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 data-[state=checked]:border-[var(--amber)] data-[state=checked]:bg-[var(--amber)] data-[state=checked]:text-white"
                                    data-testid="checkbox-job-urgent"
                                />
                                <span>
                                    <span className="block text-[13px] font-semibold text-[var(--navy)]">
                                        Mark as urgent
                                    </span>
                                    <span className="mt-0.5 block text-[11px] text-[var(--slate)]">
                                        Adds an Urgent badge to the job post to
                                        highlight priority recruitment
                                    </span>
                                </span>
                            </label>
                        </FormSection>
                        <FormSection
                            step={2}
                            title="Job requirements"
                            description="Specify qualifications, gender preference, and candidate criteria."
                            icon={ClipboardCheck}
                        >
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
                                                    value={level}
                                                    data-testid={`education-option-${level}`}
                                                >
                                                    {EDUCATION_LABELS[level]}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </JobField>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex min-w-0 flex-col gap-1.5">
                                    <Label
                                        htmlFor="job-min-experience"
                                        className={labelClass}
                                    >
                                        Experience (Years)
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="job-min-experience"
                                            type="number"
                                            min={0}
                                            step={1}
                                            inputMode="numeric"
                                            value={form.minExperienceYears}
                                            onChange={(event) =>
                                                setField(
                                                    'minExperienceYears',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Min"
                                            aria-label="Minimum experience in years"
                                            {...invalid(
                                                'minExperienceYears',
                                                'job-min-experience',
                                            )}
                                            className={cn(inputClass, 'flex-1')}
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
                                            value={form.maxExperienceYears}
                                            onChange={(event) =>
                                                setField(
                                                    'maxExperienceYears',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Max"
                                            aria-label="Maximum experience in years"
                                            {...invalid(
                                                'maxExperienceYears',
                                                'job-max-experience',
                                            )}
                                            className={cn(inputClass, 'flex-1')}
                                            data-testid="input-job-max-experience"
                                        />
                                    </div>
                                    <InputError
                                        id="job-min-experience-error"
                                        message={errors.minExperienceYears}
                                        role="alert"
                                        className="mt-0"
                                    />
                                    <InputError
                                        id="job-max-experience-error"
                                        message={errors.maxExperienceYears}
                                        role="alert"
                                        className="mt-0"
                                    />
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
                                                label: GENDER_LABELS[value],
                                            }),
                                        )}
                                        aria-labelledby="job-gender-label"
                                        data-testid="toggle-job-gender"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className={labelClass}>
                                    Required languages
                                </span>
                                <LanguageChipsField
                                    value={form.languages}
                                    onChange={(value) =>
                                        setField('languages', value)
                                    }
                                    options={options.languages}
                                    proficiencies={options.proficiencies}
                                />
                                <div
                                    data-field="languages"
                                    tabIndex={-1}
                                    aria-invalid={Boolean(formErrors.languages)}
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
                                                    entry?.language?.message ??
                                                    entry?.proficiency?.message
                                                }
                                            />
                                        ),
                                    )}
                                </div>
                            </div>
                            <JobField
                                id="job-apply-instructions"
                                label="How to apply / Submission instructions"
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
                            <div className="flex flex-col gap-1.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Label
                                        htmlFor="job-other-requirements"
                                        className={labelClass}
                                    >
                                        Other requirements / Additional
                                        qualifications
                                    </Label>
                                    <span className="text-[11px] text-[var(--slate)]">
                                        Optional notes &amp; criteria
                                    </span>
                                </div>
                                <p
                                    id="other-requirements-hint"
                                    className="text-[11px] text-[var(--slate)]"
                                >
                                    Add any specific certifications, licenses,
                                    or special requirements not covered above.
                                </p>
                                <RichTextEditor
                                    id="job-other-requirements"
                                    value={form.otherRequirements}
                                    onChange={(value) =>
                                        setField('otherRequirements', value)
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
                                    message={errors.otherRequirements}
                                />
                            </div>
                        </FormSection>
                        <FormSection
                            step={3}
                            title="Screening questions"
                            description="Ask applicants specific questions to pre-screen candidates before reviewing applications."
                            icon={CircleHelp}
                            optional
                        >
                            <JobPostQuestionsField
                                control={control}
                                register={register}
                                setValue={setValue}
                                errors={formErrors}
                                options={options.answer_types}
                            />
                        </FormSection>
                        <FormSection
                            step={4}
                            title="Employer"
                            description="The company behind the vacancy."
                            icon={Building2}
                            optional
                        >
                            <JobField
                                id="job-employer"
                                label="Employer name / Search"
                                error={errors.employerId}
                            >
                                <EmployerCombobox
                                    value={form.employerId}
                                    employers={employerOptions}
                                    {...invalid('employerId', 'job-employer')}
                                    onChange={(value) =>
                                        setField('employerId', value)
                                    }
                                    onAddNew={(name) => {
                                        setEmployerDraft({
                                            name,
                                            location: '',
                                            poeaLicenseNo: '',
                                        });
                                        setEmployerError('');
                                        setEmployerFieldErrors({});
                                        setEmployerOpen(true);
                                    }}
                                />
                            </JobField>
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
                        </FormSection>
                    </fieldset>
                </form>
                <div
                    className="sticky bottom-0 z-10 -mx-4 flex min-h-[60px] flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-white px-4 py-3 md:-mx-8 md:px-8"
                    data-testid="job-action-bar"
                >
                    <p className="text-xs text-[var(--slate)]">
                        All fields marked with{' '}
                        <span className="text-destructive">*</span> are
                        required.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9"
                            asChild
                            data-testid="button-cancel-job"
                        >
                            <Link href={jobs()}>Cancel</Link>
                        </Button>
                        <Button
                            type="submit"
                            form="form-new-job"
                            variant="primary"
                            size="sm"
                            className="h-9"
                            data-testid="button-publish-job"
                            disabled={publishing || employerSaving}
                        >
                            Review job post
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
                onValidationClose={() => {
                    if (!focusAfterReviewClose.current) return false;
                    focusAfterReviewClose.current = false;
                    focusFirstError(undefined, false);
                    return true;
                }}
            />
            <Dialog
                open={employerOpen}
                onOpenChange={(open) => {
                    if (!employerSaving) setEmployerOpen(open);
                }}
            >
                <DialogContent data-testid="new-employer-dialog">
                    <DialogHeader>
                        <DialogTitle>Add a new employer</DialogTitle>
                        <DialogDescription>
                            Register the company behind the vacancy. It will be
                            available to every future job post.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            saveEmployer();
                        }}
                        className="flex flex-col gap-4"
                        data-testid="form-new-employer"
                    >
                        <fieldset
                            disabled={employerSaving}
                            className="contents"
                        >
                            {(
                                [
                                    {
                                        field: 'name',
                                        serverField: 'employer_name',
                                        id: 'employer-name',
                                        label: 'Employer name',
                                    },
                                    {
                                        field: 'location',
                                        serverField: 'employer_location',
                                        id: 'employer-location',
                                        label: 'Location',
                                    },
                                    {
                                        field: 'poeaLicenseNo',
                                        serverField: 'employer_license_number',
                                        id: 'employer-license',
                                        label: 'POEA / DMW licence no.',
                                    },
                                ] as const
                            ).map(({ field, serverField, id, label }) => (
                                <JobField
                                    key={field}
                                    id={id}
                                    label={label}
                                    required
                                    error={employerFieldErrors[serverField]}
                                >
                                    <Input
                                        id={id}
                                        required
                                        value={employerDraft[field]}
                                        onChange={(event) => {
                                            setEmployerDraft((current) => ({
                                                ...current,
                                                [field]: event.target.value,
                                            }));
                                            setEmployerError('');
                                        }}
                                        aria-invalid={Boolean(
                                            employerFieldErrors[serverField] ||
                                            (employerError &&
                                                !employerDraft[field].trim()),
                                        )}
                                        aria-describedby={
                                            employerFieldErrors[serverField]
                                                ? `${id}-error`
                                                : employerError
                                                  ? 'error-employer'
                                                  : undefined
                                        }
                                        data-field={`employer-${field}`}
                                        className={inputClass}
                                        data-testid={`input-${id}`}
                                    />
                                </JobField>
                            ))}
                            <InputError
                                id="error-employer"
                                message={employerError}
                                role="alert"
                                data-testid="error-employer"
                            />
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setEmployerOpen(false)}
                                    data-testid="button-cancel-employer"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    loading={employerSaving}
                                    data-testid="button-save-employer"
                                >
                                    Save employer
                                </Button>
                            </DialogFooter>
                        </fieldset>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

DashboardNewJob.layout = {
    breadcrumbs: [
        { title: 'Jobs', href: jobs() },
        { title: 'New Job', href: '#' },
    ],
};
