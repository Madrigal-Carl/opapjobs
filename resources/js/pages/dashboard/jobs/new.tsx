import { Head, Link } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ArrowLeft,
    ArrowRight,
    BriefcaseBusiness,
    Building2,
    CircleHelp,
    ClipboardCheck,
    MapPin,
    Plus,
    Trash2,
} from 'lucide-react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useForm, type FieldErrors, type PathValue } from 'react-hook-form';
import { toast } from 'sonner';
import { EmployerCombobox } from '@/components/dashboard/employer-combobox';
import { FormSection } from '@/components/dashboard/form-section';
import { JobListingPreviewDialog } from '@/components/dashboard/job-listing-preview-dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { getAgencyPathway } from '@/data/agency-context';
import { addEmployer } from '@/data/employers';
import {
    CONTRACT_LABELS,
    EDUCATION_LABELS,
    GENDER_LABELS,
} from '@/data/job-attributes';
import { getCategories, getSubCategories } from '@/data/job-categories';
import {
    buildJobListing,
    emptyJobForm,
    jobFormSchema,
    type JobForm,
} from '@/data/job-form';
import { QUESTION_ANSWER_TYPES } from '@/data/job-questions';
import { addJob, findSimilarJob } from '@/data/job-store';
import { cn } from '@/lib/utils';
import { jobs } from '@/routes/dashboard';
import type {
    ContractDuration,
    EducationLevel,
    GenderRequirement,
    JobQuestion,
} from '@/types/job';

const LANGUAGE_OPTIONS = [
    'English',
    'Arabic',
    'Tagalog',
    'Mandarin',
    'Hindi',
    'Urdu',
    'Spanish',
    'Portuguese',
    'Russian',
    'Japanese',
];
const SALARY_CURRENCIES = ['SAR', 'AED', 'QAR', 'KWD', 'SGD', 'USD', 'PHP'];
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

export default function DashboardNewJob() {
    const {
        watch,
        setValue,
        clearErrors,
        reset,
        handleSubmit,
        formState: { errors: formErrors, isSubmitting },
    } = useForm<JobForm>({
        defaultValues: emptyJobForm,
        resolver: zodResolver(jobFormSchema),
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
    const [employerOpen, setEmployerOpen] = useState(false);
    const [employerDraft, setEmployerDraft] = useState({
        name: '',
        location: '',
        poeaLicenseNo: '',
    });
    const [employerError, setEmployerError] = useState('');
    const formRef = useRef<HTMLFormElement>(null);
    const agencyPathway = getAgencyPathway();
    const categoryOptions = getCategories(agencyPathway);
    const subCategoryOptions = getSubCategories(agencyPathway, form.category);
    const duplicates = useMemo(
        () =>
            findSimilarJob({
                employer: form.employer,
                title: form.title.trim(),
                category: form.category,
            }),
        [form.employer, form.title, form.category],
    );
    const previewJob = buildJobListing(form, 'published');

    const setField = <K extends keyof JobForm>(field: K, value: JobForm[K]) => {
        setValue(field, value as PathValue<JobForm, K>, { shouldDirty: true });
        clearErrors(field);
    };

    const changeCategory = (category: string) => {
        setField('category', category);
        setField('subCategory', '');
    };

    const updateQuestion = (index: number, patch: Partial<JobQuestion>) => {
        setField(
            'questions',
            form.questions.map((question, questionIndex) =>
                questionIndex === index ? { ...question, ...patch } : question,
            ),
        );
    };

    const addQuestion = () => {
        setField('questions', [
            ...form.questions,
            {
                id: `question-${crypto.randomUUID()}`,
                label: '',
                type: 'yesno',
                answer: '',
            },
        ]);
    };

    const removeQuestion = (id: string) => {
        setField(
            'questions',
            form.questions.filter((question) => question.id !== id),
        );
    };

    const focusFirstError = (fieldErrors: FieldErrors<JobForm>) => {
        const order: (keyof JobForm)[] = [
            'title',
            'category',
            'subCategory',
            'location',
            'quantity',
            'contractDuration',
            'salaryMin',
            'salaryMax',
            'closingDate',
            'description',
            'education',
            'minExperienceYears',
            'maxExperienceYears',
            'contactEmail',
        ];
        const first = order.find((field) => fieldErrors[field]);
        const target = formRef.current?.querySelector<HTMLElement>(
            `[data-field="${first}"]`,
        );

        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target?.focus({ preventScroll: true });
        toast.error('Please fix the highlighted fields.');
    };

    const publish = (status: 'draft' | 'published') =>
        handleSubmit((values) => {
            addJob({
                ...buildJobListing(values, status),
                id: `job-${crypto.randomUUID()}`,
            });
            setReviewOpen(false);
            reset({
                ...emptyJobForm,
                languages: [],
                questions: emptyJobForm.questions.map((question) => ({
                    ...question,
                })),
            });
            toast.success(
                status === 'draft'
                    ? 'Listing saved as a draft.'
                    : 'Job listing published.',
            );
        }, focusFirstError)();

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

        const created = addEmployer({ name, location, poeaLicenseNo });
        setField('employer', created.name);
        setEmployerOpen(false);
        setEmployerError('');
        setEmployerDraft({ name: '', location: '', poeaLicenseNo: '' });
        toast.success(`${created.name} added.`);
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
                    subtitle="Create a clear, applicant-focused listing for your next placement."
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
                        focusFirstError,
                    )}
                    className="flex w-full flex-col gap-5"
                    data-testid="form-new-job"
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
                                    options={[
                                        {
                                            value: 'joborder',
                                            label: 'Job order',
                                        },
                                        {
                                            value: 'manpooling',
                                            label: 'Manpooling',
                                        },
                                    ]}
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
                                error={errors.category}
                            >
                                <Select
                                    value={form.category}
                                    onValueChange={changeCategory}
                                >
                                    <SelectTrigger
                                        id="job-category"
                                        aria-required
                                        {...invalid('category', 'job-category')}
                                        className={selectClass}
                                        data-testid="select-job-category-new"
                                    >
                                        <SelectValue placeholder="Choose a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categoryOptions.map((category) => (
                                            <SelectItem
                                                key={category}
                                                value={category}
                                                data-testid={`category-option-${category}`}
                                            >
                                                {category}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </JobField>
                            <JobField
                                id="job-subcategory"
                                label="Sub-category"
                                required
                                error={errors.subCategory}
                            >
                                <Select
                                    value={form.subCategory}
                                    onValueChange={(value) =>
                                        setField('subCategory', value)
                                    }
                                    disabled={
                                        !form.category ||
                                        subCategoryOptions.length === 0
                                    }
                                >
                                    <SelectTrigger
                                        id="job-subcategory"
                                        aria-required
                                        {...invalid(
                                            'subCategory',
                                            'job-subcategory',
                                        )}
                                        className={selectClass}
                                        data-testid="select-job-subcategory-new"
                                    >
                                        <SelectValue
                                            placeholder={
                                                form.category
                                                    ? 'Choose a sub-category'
                                                    : 'Choose a category first'
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subCategoryOptions.map(
                                            (subCategory) => (
                                                <SelectItem
                                                    key={subCategory}
                                                    value={subCategory}
                                                    data-testid={`subcategory-option-${subCategory}`}
                                                >
                                                    {subCategory}
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
                                        setField('location', event.target.value)
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
                                        {Object.entries(CONTRACT_LABELS).map(
                                            ([value, label]) => (
                                                <SelectItem
                                                    key={value}
                                                    value={value}
                                                    data-testid={`contract-option-${value}`}
                                                >
                                                    {label}
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
                                            data-testid="select-salary-currency"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SALARY_CURRENCIES.map(
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
                                {...invalid('description', 'job-description')}
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
                                    Adds an Urgent badge to the listing to
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
                                        value as EducationLevel,
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="job-education"
                                    aria-required
                                    {...invalid('education', 'job-education')}
                                    className={selectClass}
                                    data-testid="select-job-education"
                                >
                                    <SelectValue placeholder="Choose an education level" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(EDUCATION_LABELS)
                                        .filter(([level]) => level !== 'any')
                                        .map(([level, label]) => (
                                            <SelectItem
                                                key={level}
                                                value={level}
                                                data-testid={`education-option-${level}`}
                                            >
                                                {label}
                                            </SelectItem>
                                        ))}
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
                                    <span className="text-destructive"> *</span>
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="job-min-experience"
                                        type="number"
                                        min={0}
                                        step={1}
                                        required
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
                                    options={Object.entries(GENDER_LABELS).map(
                                        ([value, label]) => ({
                                            value: value as GenderRequirement,
                                            label,
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
                                options={LANGUAGE_OPTIONS}
                            />
                        </div>
                        <JobField
                            id="job-apply-instructions"
                            label="How to apply / Submission instructions"
                        >
                            <Input
                                id="job-apply-instructions"
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
                                Add any specific certifications, licenses, or
                                special requirements not covered above.
                            </p>
                            <RichTextEditor
                                id="job-other-requirements"
                                value={form.otherRequirements}
                                onChange={(value) =>
                                    setField('otherRequirements', value)
                                }
                                rows={5}
                                aria-describedby="other-requirements-hint"
                                data-testid="input-job-other-requirements"
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
                        <div>
                            <p className={labelClass}>Custom questions</p>
                            <p className="mt-1 text-[11px] text-[var(--slate)]">
                                Choose an answer type, then provide question
                                details.
                            </p>
                        </div>
                        {form.questions.map((question, index) => (
                            <div
                                key={question.id}
                                className="flex flex-col gap-3 rounded-lg border border-[var(--line)] bg-white p-3"
                            >
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={question.label}
                                        onChange={(event) =>
                                            updateQuestion(index, {
                                                label: event.target.value,
                                            })
                                        }
                                        placeholder="Enter your question"
                                        aria-label={`Custom question ${index + 1}`}
                                        className={cn(inputClass, 'flex-1')}
                                        data-testid={`input-question-label-${index}`}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-9 text-[var(--slate)] hover:text-destructive"
                                        onClick={() =>
                                            removeQuestion(question.id)
                                        }
                                        aria-label={`Remove custom question ${index + 1}`}
                                        data-testid={`button-remove-question-${index}`}
                                    >
                                        <Trash2
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </Button>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Select
                                        value={question.type}
                                        onValueChange={(value) =>
                                            updateQuestion(index, {
                                                type: value as JobQuestion['type'],
                                                answer: '',
                                            })
                                        }
                                    >
                                        <SelectTrigger
                                            className={selectClass}
                                            aria-label={`Answer type for question ${index + 1}`}
                                            data-testid={`select-question-type-${index}`}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {QUESTION_ANSWER_TYPES.map(
                                                (option) => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                        data-testid={`question-type-${index}-${option.value}`}
                                                    >
                                                        {option.label}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {question.type === 'yesno' ? (
                                        <Select
                                            value={question.answer}
                                            onValueChange={(value) =>
                                                updateQuestion(index, {
                                                    answer: value,
                                                })
                                            }
                                        >
                                            <SelectTrigger
                                                className={selectClass}
                                                aria-label={`Expected answer for question ${index + 1}`}
                                                data-testid={`select-question-answer-${index}`}
                                            >
                                                <SelectValue placeholder="Choose an answer" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {['Yes', 'No'].map((answer) => (
                                                    <SelectItem
                                                        key={answer}
                                                        value={answer}
                                                        data-testid={`question-answer-${index}-${answer}`}
                                                    >
                                                        {answer}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : question.type === 'short' ? (
                                        <Input
                                            value={question.answer}
                                            onChange={(event) =>
                                                updateQuestion(index, {
                                                    answer: event.target.value,
                                                })
                                            }
                                            placeholder="Short answer goes here"
                                            aria-label={`Expected answer for question ${index + 1}`}
                                            className={inputClass}
                                            data-testid={`input-question-answer-${index}`}
                                        />
                                    ) : (
                                        <Textarea
                                            rows={3}
                                            value={question.answer}
                                            onChange={(event) =>
                                                updateQuestion(index, {
                                                    answer: event.target.value,
                                                })
                                            }
                                            placeholder="Let the applicant explain in their own words…"
                                            aria-label={`Expected answer for question ${index + 1}`}
                                            className="min-w-0 px-3 py-2 text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 sm:col-span-2"
                                            data-testid={`textarea-question-answer-${index}`}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={addQuestion}
                            className="h-9 self-start"
                            data-testid="button-add-question"
                        >
                            <Plus className="size-3.5" aria-hidden="true" />
                            Add question
                        </Button>
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
                        >
                            <EmployerCombobox
                                value={form.employer}
                                onChange={(value) =>
                                    setField('employer', value)
                                }
                                onAddNew={(name) => {
                                    setEmployerDraft({
                                        name,
                                        location: '',
                                        poeaLicenseNo: '',
                                    });
                                    setEmployerError('');
                                    setEmployerOpen(true);
                                }}
                            />
                        </JobField>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <JobField
                                id="job-contact-name"
                                label="Contact person"
                            >
                                <Input
                                    id="job-contact-name"
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
                        <JobField id="job-contact-phone" label="Contact phone">
                            <PhoneField
                                value={form.contactPhone}
                                onChange={(value) =>
                                    setField('contactPhone', value)
                                }
                            />
                        </JobField>
                    </FormSection>
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
                            disabled={isSubmitting}
                        >
                            Publish listing
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            </DashboardPage>
            <JobListingPreviewDialog
                open={reviewOpen}
                onOpenChange={setReviewOpen}
                job={previewJob}
                duplicates={duplicates}
                onConfirm={() => publish('published')}
                confirming={isSubmitting}
            />
            <Dialog open={employerOpen} onOpenChange={setEmployerOpen}>
                <DialogContent data-testid="new-employer-dialog">
                    <DialogHeader>
                        <DialogTitle>Add a new employer</DialogTitle>
                        <DialogDescription>
                            Register the company behind the vacancy. It will be
                            available to every future listing.
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
                        {(
                            [
                                {
                                    field: 'name',
                                    id: 'employer-name',
                                    label: 'Employer name',
                                },
                                {
                                    field: 'location',
                                    id: 'employer-location',
                                    label: 'Location',
                                },
                                {
                                    field: 'poeaLicenseNo',
                                    id: 'employer-license',
                                    label: 'POEA / DMW licence no.',
                                },
                            ] as const
                        ).map(({ field, id, label }) => (
                            <JobField
                                key={field}
                                id={id}
                                label={label}
                                required
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
                                        employerError &&
                                        !employerDraft[field].trim(),
                                    )}
                                    aria-describedby={
                                        employerError
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
                                data-testid="button-save-employer"
                            >
                                Save employer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

DashboardNewJob.layout = {
    breadcrumbs: [
        { title: 'Jobs', href: jobs() },
        { title: 'New Listing', href: '#' },
    ],
};
