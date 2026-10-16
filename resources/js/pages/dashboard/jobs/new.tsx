import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    BriefcaseBusiness,
    Building2,
    ClipboardList,
    Info,
    Plus,
    Search,
    SlidersHorizontal,
    Trash2,
    TriangleAlert,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import { FormSection } from '@/components/dashboard/form-section';
import { DashboardPage } from '@/components/dashboard/page';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    CONTRACT_LABELS,
    EDUCATION_LABELS,
    GENDER_LABELS,
    PROFICIENCY_LABELS,
    ageRangeLabel,
    experienceRangeLabel,
    getPublicEmployer,
    getPublicLocation,
} from '@/data/job-attributes';
import {
    getAgencyContext,
    getAgencyPathway,
    PATHWAY_LABELS,
} from '@/data/agency-context';
import { getCategories, getSubCategories } from '@/data/job-categories';
import { addEmployer, getEmployer, getEmployers } from '@/data/employers';
import { addJob, findSimilarJob } from '@/data/job-store';
import { QUESTION_ANSWER_TYPES } from '@/data/job-questions';
import { jobs } from '@/routes/dashboard';
import type {
    ContractDuration,
    EducationLevel,
    GenderRequirement,
    JobLanguage,
    LanguageProficiency,
    ListingStatus,
    PostingType,
    QuestionAnswerType,
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

/**
 * Thin wrappers over `job-attributes` so the preview text and the
 * applicant-facing text are produced by the same function.
 */
function experienceRangeText(min: number, max: number): string {
    return experienceRangeLabel({
        minExperienceYears: min,
        maxExperienceYears: max,
    });
}

function ageRangeText(min: string, max: string): string {
    return ageRangeLabel({
        ageMin: Number(min) || undefined,
        ageMax: Number(max) || undefined,
    });
}

const POSTING_TYPE_HINTS: Record<PostingType, string> = {
    joborder:
        'The employer is named on the listing. Applicants see the company, its location and its POEA/DMW licence number.',
    manpooling:
        'The employer stays private. Applicants only see the agency, so the listing is marked Manpooling and employer details are hidden.',
};

type QuestionDraft = {
    id: string;
    label: string;
    type: QuestionAnswerType;
    answer: string;
    /** Blocks the applicant from continuing until this is answered. */
    required: boolean;
};

type JobForm = {
    postingType: PostingType;
    status: ListingStatus;
    employer: string;
    title: string;
    agency: string;
    category: string;
    subCategory: string;
    quantity: number;
    gender: GenderRequirement;
    salary: string;
    description: string;
    closingDate: string;
    minExperienceYears: number;
    maxExperienceYears: number;
    education: EducationLevel;
    contractDuration: ContractDuration;
    benefits: string[];
    languages: JobLanguage[];
    ageMin: string;
    ageMax: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    applyInstructions: string;
    featured: boolean;
    urgent: boolean;
    questions: QuestionDraft[];
};

type FieldErrors = Partial<Record<keyof JobForm, string>>;

const emptyForm: JobForm = {
    postingType: 'joborder',
    status: 'published',
    employer: '',
    title: '',
    agency: '',
    category: '',
    subCategory: '',
    quantity: 1,
    gender: 'any',
    salary: '',
    description: '',
    closingDate: '',
    minExperienceYears: 0,
    maxExperienceYears: 0,
    education: 'any',
    contractDuration: 'fixed',
    benefits: [],
    languages: [],
    ageMin: '',
    ageMax: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    applyInstructions: '',
    featured: false,
    urgent: false,
    questions: [
        {
            id: 'question-1',
            label: 'Are you willing to relocate for this role?',
            type: 'yesno',
            answer: '',
            required: true,
        },
    ],
};

export default function DashboardNewJob() {
    const [form, setForm] = useState<JobForm>(emptyForm);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [employerOpen, setEmployerOpen] = useState(false);
    const [employerSearch, setEmployerSearch] = useState('');
    const [employerDraft, setEmployerDraft] = useState({
        name: '',
        location: '',
        poeaLicenseNo: '',
    });
    const [employerError, setEmployerError] = useState('');
    const [duplicateWarning, setDuplicateWarning] = useState<string[]>([]);
    const formRef = useRef<HTMLFormElement>(null);
    const agencyPathway = getAgencyPathway();

    // Warn as soon as the listing looks like one that already exists.
    const duplicates = useMemo(() => {
        if (!form.employer || !form.title.trim() || !form.category) {
            return [];
        }

        return findSimilarJob({
            employer: form.employer,
            title: form.title.trim(),
            category: form.category,
        });
    }, [form.employer, form.title, form.category]);

    const categoryOptions = useMemo(
        () => getCategories(agencyPathway),
        [agencyPathway],
    );
    const subCategoryOptions = useMemo(
        () => getSubCategories(agencyPathway, form.category),
        [agencyPathway, form.category],
    );

    const employerList = getEmployers();
    const selectedEmployer = form.employer
        ? getEmployer(form.employer)
        : undefined;
    const employerQuery = employerSearch.trim().toLowerCase();
    const visibleEmployers = employerList.filter((employer) =>
        `${employer.name} ${employer.location}`
            .toLowerCase()
            .includes(employerQuery),
    );
    const [highlight, setHighlight] = useState(0);
    const [searchFocused, setSearchFocused] = useState(false);
    const employerBoxRef = useRef<HTMLDivElement>(null);
    // Suggestions only appear once there is something to search for
    // and the field has focus, so an untouched form stays quiet.
    const suggestionsOpen = employerQuery !== '' && searchFocused;
    const suggestionOptions = employerQuery ? visibleEmployers : [];

    useEffect(() => {
        setHighlight(0);
    }, [employerQuery]);

    const chooseEmployer = (name: string) => {
        setField('employer', name);
        setEmployerSearch('');
        setSearchFocused(false);
    };

    // Clicking anywhere else closes the suggestion list.
    useEffect(() => {
        if (!suggestionsOpen) {
            return;
        }

        const onPointerDown = (event: PointerEvent) => {
            if (!employerBoxRef.current?.contains(event.target as Node)) {
                setSearchFocused(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);

        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [suggestionsOpen]);

    const onEmployerSearchKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key === 'Escape') {
            setEmployerSearch('');
            return;
        }

        if (suggestionOptions.length === 0) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlight((current) => (current + 1) % suggestionOptions.length);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlight(
                (current) =>
                    (current - 1 + suggestionOptions.length) %
                    suggestionOptions.length,
            );
            return;
        }

        if (event.key === 'Enter') {
            const option = suggestionOptions[highlight];

            if (option) {
                event.preventDefault();
                chooseEmployer(option.name);
            }
        }
    };

    const setField = <K extends keyof JobForm>(field: K, value: JobForm[K]) => {
        setForm((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const clearError = (field: keyof JobForm) => {
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const changeCategory = (category: string) => {
        setForm((current) => ({
            ...current,
            category,
            subCategory: '',
        }));
        setErrors((current) => ({
            ...current,
            category: undefined,
            subCategory: undefined,
        }));
    };

    const adjustQuantity = (delta: number) => {
        const next = Math.max(1, form.quantity + delta);

        setField('quantity', next);
    };

    const updateQuestion = (index: number, patch: Partial<QuestionDraft>) => {
        const questions = [...form.questions];

        questions[index] = { ...questions[index], ...patch };
        setForm((current) => ({ ...current, questions }));
    };

    const removeQuestion = (id: string) => {
        setForm((current) => ({
            ...current,
            questions: current.questions.filter(
                (question) => question.id !== id,
            ),
        }));
    };

    const addQuestion = () => {
        setForm((current) => ({
            ...current,
            questions: [
                ...current.questions,
                {
                    id: `question-${Date.now()}`,
                    label: '',
                    type: 'yesno',
                    answer: '',
                    required: false,
                },
            ],
        }));
    };

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

        setEmployerDraft({ name: '', location: '', poeaLicenseNo: '' });
        setEmployerError('');
        setEmployerOpen(false);
        setEmployerSearch('');
        setField('employer', created.name);

        toast.success(`${created.name} added.`);
    };

    const validate = (): FieldErrors => {
        const next: FieldErrors = {};

        if (!form.title.trim()) {
            next.title = 'Enter the job title.';
        }

        if (!form.employer) {
            next.employer = 'Choose an employer.';
        }

        if (!form.agency.trim()) {
            next.agency = 'Enter the recruitment agency.';
        }

        if (form.quantity < 1) {
            next.quantity = 'Quantity must be at least 1.';
        }

        if (!form.category) {
            next.category = 'Choose a category.';
        }

        if (!form.subCategory) {
            next.subCategory = 'Choose a sub-category.';
        }

        if (!form.description.trim()) {
            next.description =
                'Describe the role so applicants know what to expect.';
        }

        if (
            form.minExperienceYears > 0 &&
            form.maxExperienceYears > 0 &&
            form.maxExperienceYears < form.minExperienceYears
        ) {
            next.maxExperienceYears =
                'Maximum experience must be at least the minimum.';
        }

        if (
            form.ageMin &&
            form.ageMax &&
            Number(form.ageMax) < Number(form.ageMin)
        ) {
            next.ageMax = 'Maximum age must be at least the minimum.';
        }

        if (
            form.contactEmail.trim() &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())
        ) {
            next.contactEmail = 'Enter a valid email address.';
        }

        return next;
    };

    /**
     * Moves focus to the first invalid control so keyboard and
     * screen-reader users are taken straight to the problem.
     */
    const focusFirstError = (fieldErrors: FieldErrors) => {
        const order = [
            'postingType',
            'title',
            'employer',
            'agency',
            'category',
            'subCategory',
            'quantity',
            'gender',
        ] as const;
        const first = order.find((field) => fieldErrors[field]);

        if (!first) {
            return;
        }

        const target = formRef.current?.querySelector<HTMLElement>(
            `[data-field="${first}"]`,
        );

        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => target?.focus(), 220);
    };

    const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const submitter = event.nativeEvent as SubmitEvent;
        const intent =
            submitter.submitter?.getAttribute('data-intent') ?? 'publish';

        publish(intent === 'draft' ? 'draft' : 'published');
    };

    const publish = (status: ListingStatus) => {
        const fieldErrors = validate();

        setErrors(fieldErrors);

        if (Object.keys(fieldErrors).length > 0) {
            focusFirstError(fieldErrors);
            toast.error('Please fix the highlighted fields.');
            return;
        }

        // First publish attempt on a possible duplicate asks for
        // confirmation; the second goes through.
        if (duplicates.length > 0 && duplicateWarning.length === 0) {
            setDuplicateWarning(duplicates.map((job) => job.id));
            toast.warning(
                'A similar listing already exists. Check before publishing.',
            );
            return;
        }

        setDuplicateWarning([]);
        const employer = getEmployer(form.employer);

        addJob({
            id: `job-${Date.now()}`,
            title: form.title.trim(),
            employer: form.employer,
            agency: form.agency.trim(),
            pathway: agencyPathway,
            location: employer?.location ?? '',
            salary: form.salary.trim() || 'Competitive salary',
            posted: 'Just now',
            status,
            postingType: form.postingType,
            employerLocation: employer?.location ?? '',
            poeaLicenseNo: employer?.poeaLicenseNo ?? '',
            quantity: form.quantity,
            gender: form.gender,
            category: form.category,
            subCategory: form.subCategory,
            description: form.description.trim() || undefined,
            closingDate: form.closingDate || undefined,
            minExperienceYears:
                form.minExperienceYears > 0
                    ? form.minExperienceYears
                    : undefined,
            maxExperienceYears:
                form.maxExperienceYears > 0
                    ? form.maxExperienceYears
                    : undefined,
            education: form.education === 'any' ? undefined : form.education,
            contractDuration:
                form.contractDuration === 'fixed'
                    ? undefined
                    : form.contractDuration,
            benefits: form.benefits,
            languages: form.languages,
            ageMin: form.ageMin ? Number(form.ageMin) : undefined,
            ageMax: form.ageMax ? Number(form.ageMax) : undefined,
            contactName: form.contactName.trim() || undefined,
            contactEmail: form.contactEmail.trim() || undefined,
            contactPhone: form.contactPhone.trim() || undefined,
            applyInstructions: form.applyInstructions.trim() || undefined,
            featured: form.featured,
            urgent: form.urgent,
            recent: true,
            questions: form.questions
                .map((question) => ({
                    id: question.id,
                    label: question.label.trim(),
                    type: question.type,
                    answer: question.answer.trim(),
                    required: question.required,
                }))
                .filter((question) => question.label !== ''),
        });

        setForm({
            ...emptyForm,
            questions: emptyForm.questions.map((question) => ({
                ...question,
            })),
        });
        setErrors({});

        toast.success(
            status === 'draft'
                ? 'Listing saved as a draft.'
                : 'Job listing published.',
        );
    };

    return (
        <>
            <Head title="Post a new job" />

            <DashboardPage>
                <DashboardPageHeader
                    title="Post a new job"
                    subtitle="Create a clear, applicant-focused listing for your next placement."
                    actions={
                        <Button variant="secondary" size="sm" asChild>
                            <Link href={jobs()}>
                                <ArrowLeft aria-hidden="true" />
                                Back to jobs
                            </Link>
                        </Button>
                    }
                />

                <div className="grid gap-4 xl:grid-cols-5">
                    <form
                        ref={formRef}
                        id="form-new-job"
                        onSubmit={submitForm}
                        className="flex flex-col gap-4 xl:col-span-3"
                        data-testid="form-new-job"
                        noValidate
                    >
                        <FormSection
                            step={1}
                            title="Posting info"
                            description="How this listing reaches applicants."
                            icon={ClipboardList}
                        >
                            <div className="flex flex-col gap-2">
                                <Label
                                    htmlFor="posting-type"
                                    id="posting-type-label"
                                >
                                    Posting type *
                                </Label>
                                <ToggleGroup
                                    type="single"
                                    variant="outline"
                                    value={form.postingType}
                                    onValueChange={(value) => {
                                        if (value) {
                                            setField(
                                                'postingType',
                                                value as PostingType,
                                            );
                                        }
                                    }}
                                    aria-labelledby="posting-type-label"
                                    data-field="postingType"
                                    data-testid="toggle-posting-type"
                                    className="w-fit"
                                >
                                    <ToggleGroupItem
                                        value="joborder"
                                        className="px-3 py-1.5 text-xs"
                                        data-testid="toggle-posting-type-joborder"
                                    >
                                        With Job Order
                                    </ToggleGroupItem>
                                    <ToggleGroupItem
                                        value="manpooling"
                                        className="px-3 py-1.5 text-xs"
                                        data-testid="toggle-posting-type-manpooling"
                                    >
                                        Manpooling
                                    </ToggleGroupItem>
                                </ToggleGroup>
                                <p className="flex items-start gap-1.5 text-xs text-[var(--slate)]">
                                    <Info
                                        className="mt-px size-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        {POSTING_TYPE_HINTS[form.postingType]}
                                    </span>
                                </p>
                            </div>

                            <div className="flex items-start gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
                                <Info
                                    className="mt-0.5 size-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                                <p className="text-xs text-[var(--slate)]">
                                    The listing goes live as soon as you
                                    publish, and closes itself once the closing
                                    date passes. Save it as a draft instead if
                                    you want to review it first.
                                </p>
                            </div>

                            {duplicates.length > 0 && (
                                <div
                                    className="flex flex-col gap-1 rounded-lg border border-[var(--amber)]/40 bg-[var(--amber)]/10 px-4 py-3"
                                    role="alert"
                                    data-testid="duplicate-warning"
                                >
                                    <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--navy)]">
                                        <TriangleAlert
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        A similar listing already exists
                                    </span>
                                    <ul className="ml-5 list-disc text-xs text-[var(--slate)]">
                                        {duplicates.map((job) => (
                                            <li key={job.id}>
                                                {job.title} — {job.category} (
                                                {job.posted})
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-xs text-[var(--slate)]">
                                        Publishing anyway will create a second
                                        listing for the same role.
                                    </p>
                                </div>
                            )}
                        </FormSection>

                        <FormSection
                            step={2}
                            title="Employer"
                            description="The company behind the vacancy."
                            icon={Building2}
                        >
                            <div className="flex flex-col gap-1.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Label htmlFor="job-employer-select">
                                        Employer *
                                    </Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        type="button"
                                        onClick={() => {
                                            setEmployerDraft({
                                                name: '',
                                                location: '',
                                                poeaLicenseNo: '',
                                            });
                                            setEmployerError('');
                                            setEmployerSearch('');
                                            setEmployerOpen(true);
                                        }}
                                        data-testid="button-add-employer"
                                    >
                                        <Plus aria-hidden="true" />
                                        Add new employer
                                    </Button>
                                </div>
                                <div className="relative" ref={employerBoxRef}>
                                    <Search
                                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        type="search"
                                        value={employerSearch}
                                        onChange={(event) => {
                                            setEmployerSearch(
                                                event.target.value,
                                            );
                                            setSearchFocused(true);
                                        }}
                                        onFocus={() => setSearchFocused(true)}
                                        onKeyDown={onEmployerSearchKeyDown}
                                        placeholder="Search employers"
                                        aria-label="Search employers"
                                        role="combobox"
                                        aria-expanded={suggestionsOpen}
                                        aria-controls="employer-suggestions"
                                        aria-autocomplete="list"
                                        aria-activedescendant={
                                            suggestionsOpen &&
                                            suggestionOptions[highlight]
                                                ? `employer-option-${highlight}`
                                                : undefined
                                        }
                                        className="h-9 max-w-72 pl-9 text-sm"
                                        data-testid="input-employer-search"
                                    />

                                    {suggestionsOpen && (
                                        <div
                                            id="employer-suggestions"
                                            role="listbox"
                                            aria-label="Employer suggestions"
                                            className="absolute left-0 z-20 mt-1 max-h-64 w-72 overflow-y-auto rounded-lg border border-[var(--line)] bg-white py-1 shadow-lg"
                                            data-testid="employer-suggestions"
                                        >
                                            {suggestionOptions.length ? (
                                                suggestionOptions.map(
                                                    (employer, index) => (
                                                        <button
                                                            key={employer.name}
                                                            id={`employer-option-${index}`}
                                                            type="button"
                                                            role="option"
                                                            aria-selected={
                                                                highlight ===
                                                                index
                                                            }
                                                            onMouseEnter={() =>
                                                                setHighlight(
                                                                    index,
                                                                )
                                                            }
                                                            onClick={() =>
                                                                chooseEmployer(
                                                                    employer.name,
                                                                )
                                                            }
                                                            className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors ${
                                                                highlight ===
                                                                index
                                                                    ? 'bg-[var(--teal-light)]'
                                                                    : 'hover:bg-[var(--surface-soft)]'
                                                            }`}
                                                            data-testid={`employer-suggestion-${index}`}
                                                        >
                                                            <span className="truncate text-sm font-medium text-[var(--navy)]">
                                                                {employer.name}
                                                            </span>
                                                            <span className="truncate text-xs text-[var(--slate)]">
                                                                {
                                                                    employer.location
                                                                }{' '}
                                                                ·{' '}
                                                                {
                                                                    employer.poeaLicenseNo
                                                                }
                                                            </span>
                                                        </button>
                                                    ),
                                                )
                                            ) : (
                                                <div className="px-3 py-2.5">
                                                    <p className="text-sm text-[var(--navy)]">
                                                        No employer matches
                                                        &ldquo;
                                                        {employerSearch.trim()}
                                                        &rdquo;.
                                                    </p>
                                                    <p className="mt-1 text-xs text-[var(--slate)]">
                                                        Use{' '}
                                                        <strong>
                                                            Add new employer
                                                        </strong>{' '}
                                                        to register it.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <Select
                                    value={form.employer}
                                    onValueChange={(value) =>
                                        setField('employer', value)
                                    }
                                >
                                    <SelectTrigger
                                        id="job-employer-select"
                                        data-field="employer"
                                        aria-label="Employer"
                                        aria-invalid={Boolean(errors.employer)}
                                        className="max-w-xl"
                                        data-testid="select-job-employer-new"
                                    >
                                        <SelectValue placeholder="Choose an employer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {visibleEmployers.length ? (
                                            visibleEmployers.map((employer) => (
                                                <SelectItem
                                                    key={employer.name}
                                                    value={employer.name}
                                                >
                                                    {employer.name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                                                No employers match &ldquo;
                                                {employerSearch}
                                                &rdquo;.
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                                <InputError
                                    message={errors.employer}
                                    data-testid="error-job-employer"
                                />
                                {selectedEmployer && (
                                    <dl
                                        className="grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 sm:grid-cols-2"
                                        data-testid="employer-details"
                                    >
                                        <div>
                                            <dt className="text-xs text-[var(--slate)]">
                                                Location
                                            </dt>
                                            <dd className="text-sm font-medium text-[var(--navy)]">
                                                {selectedEmployer.location}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-[var(--slate)]">
                                                POEA / DMW licence
                                            </dt>
                                            <dd className="text-sm font-medium text-[var(--navy)]">
                                                {selectedEmployer.poeaLicenseNo}
                                            </dd>
                                        </div>
                                    </dl>
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="job-contact-name">
                                        Contact person
                                    </Label>
                                    <Input
                                        id="job-contact-name"
                                        value={form.contactName}
                                        onChange={(event) =>
                                            setField(
                                                'contactName',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="e.g. Rizal Mendoza"
                                        data-testid="input-job-contact-name"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="job-contact-email">
                                        Contact email
                                    </Label>
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
                                        placeholder="recruitment@company.ph"
                                        aria-invalid={Boolean(
                                            errors.contactEmail,
                                        )}
                                        data-field="contactEmail"
                                        data-testid="input-job-contact-email"
                                    />
                                    <InputError
                                        message={errors.contactEmail}
                                        data-testid="error-job-contact-email"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="job-contact-phone">
                                        Contact phone
                                    </Label>
                                    <Input
                                        id="job-contact-phone"
                                        value={form.contactPhone}
                                        onChange={(event) =>
                                            setField(
                                                'contactPhone',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="+63 2 8123 4567"
                                        data-testid="input-job-contact-phone"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="job-apply-instructions">
                                    How to apply
                                </Label>
                                <textarea
                                    id="job-apply-instructions"
                                    rows={3}
                                    value={form.applyInstructions}
                                    onChange={(event) =>
                                        setField(
                                            'applyInstructions',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="e.g. Send your CV and licence to the address above. Interviews are held in Manila."
                                    aria-label="How to apply"
                                    className="max-w-2xl min-w-0 resize-none rounded-md border border-(--line) bg-white px-3 py-2 text-sm text-(--navy) outline-none focus-visible:ring-2 focus-visible:ring-(--teal)/40"
                                    data-testid="input-job-apply-instructions"
                                />
                            </div>
                        </FormSection>

                        <FormSection
                            step={3}
                            title="Job details"
                            description="What the role is and where it is based."
                            icon={BriefcaseBusiness}
                        >
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="job-title">Job title *</Label>
                                <Input
                                    id="job-title"
                                    value={form.title}
                                    onChange={(event) => {
                                        setField('title', event.target.value);
                                        clearError('title');
                                    }}
                                    onBlur={clearError.bind(null, 'title')}
                                    placeholder="e.g. Registered Nurse"
                                    aria-invalid={Boolean(errors.title)}
                                    data-field="title"
                                    className="max-w-md"
                                    data-testid="input-job-title"
                                />
                                <InputError
                                    message={errors.title}
                                    data-testid="error-job-title"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="job-agency">
                                    Recruitment agency *
                                </Label>
                                <Input
                                    id="job-agency"
                                    value={form.agency}
                                    onChange={(event) => {
                                        setField('agency', event.target.value);
                                        clearError('agency');
                                    }}
                                    placeholder="e.g. Magsaysay Global Services"
                                    aria-invalid={Boolean(errors.agency)}
                                    data-field="agency"
                                    className="max-w-md"
                                    data-testid="input-job-agency"
                                />
                                <InputError
                                    message={errors.agency}
                                    data-testid="error-job-agency"
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-sm font-medium">
                                        Pathway
                                    </span>
                                    <div
                                        className="flex h-9 items-center rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--navy)]"
                                        data-testid="job-pathway-readonly"
                                    >
                                        {PATHWAY_LABELS[agencyPathway]}
                                    </div>
                                    <p className="text-xs text-[var(--slate)]">
                                        Set by your agency (
                                        {getAgencyContext().name}). It cannot be
                                        changed per listing.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="job-salary">
                                        Salary range
                                    </Label>
                                    <Input
                                        id="job-salary"
                                        value={form.salary}
                                        onChange={(event) =>
                                            setField(
                                                'salary',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="e.g. QAR 3,200–4,100"
                                        data-testid="input-job-salary"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="job-closing-date">
                                        Closing date
                                    </Label>
                                    <Input
                                        id="job-closing-date"
                                        type="date"
                                        value={form.closingDate}
                                        onChange={(event) =>
                                            setField(
                                                'closingDate',
                                                event.target.value,
                                            )
                                        }
                                        data-field="closingDate"
                                        data-testid="input-job-closing-date"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="job-description">
                                    About this role *
                                </Label>
                                <textarea
                                    id="job-description"
                                    rows={4}
                                    value={form.description}
                                    onChange={(event) =>
                                        setField(
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                    onBlur={clearError.bind(
                                        null,
                                        'description',
                                    )}
                                    placeholder="Describe the role, the duties and what the successful applicant can expect."
                                    aria-invalid={Boolean(errors.description)}
                                    data-field="description"
                                    className="max-w-2xl min-w-0 resize-none rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                                    data-testid="input-job-description"
                                />
                                <InputError
                                    message={errors.description}
                                    data-testid="error-job-description"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <span className="text-sm font-medium">
                                    Benefits &amp; perks
                                </span>
                                <Input
                                    value={form.benefits.join(', ')}
                                    onChange={(event) =>
                                        setField(
                                            'benefits',
                                            event.target.value
                                                .split(',')
                                                .map((item) => item.trim())
                                                .filter(Boolean),
                                        )
                                    }
                                    placeholder="Separate with commas, e.g. Free accommodation, Flight tickets"
                                    aria-label="Benefits and perks"
                                    className="max-w-2xl"
                                    data-testid="input-job-benefits"
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="job-category">
                                        Category *
                                    </Label>
                                    <Select
                                        value={form.category}
                                        onValueChange={changeCategory}
                                    >
                                        <SelectTrigger
                                            id="job-category"
                                            data-field="category"
                                            aria-label="Category"
                                            aria-invalid={Boolean(
                                                errors.category,
                                            )}
                                            data-testid="select-job-category-new"
                                        >
                                            <SelectValue placeholder="Choose a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categoryOptions.map((category) => (
                                                <SelectItem
                                                    key={category}
                                                    value={category}
                                                >
                                                    {category}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={errors.category}
                                        data-testid="error-job-category"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="job-subcategory">
                                        Sub-category *
                                    </Label>
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
                                            data-field="subCategory"
                                            aria-label="Sub-category"
                                            aria-invalid={Boolean(
                                                errors.subCategory,
                                            )}
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
                                                    >
                                                        {subCategory}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={errors.subCategory}
                                        data-testid="error-job-subcategory"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="job-quantity">
                                    Vacant positions *
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        type="button"
                                        onClick={() => adjustQuantity(-1)}
                                        disabled={form.quantity <= 1}
                                        aria-label="Decrease vacant positions"
                                        data-testid="button-decrease-quantity"
                                    >
                                        −
                                    </Button>
                                    <Input
                                        id="job-quantity"
                                        type="number"
                                        min={1}
                                        inputMode="numeric"
                                        value={form.quantity}
                                        onChange={(event) => {
                                            setField(
                                                'quantity',
                                                Number.parseInt(
                                                    event.target.value,
                                                    10,
                                                ) || 1,
                                            );
                                        }}
                                        aria-invalid={Boolean(errors.quantity)}
                                        data-field="quantity"
                                        className="w-24 text-center"
                                        data-testid="input-job-quantity"
                                    />
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        type="button"
                                        onClick={() => adjustQuantity(1)}
                                        aria-label="Increase vacant positions"
                                        data-testid="button-increase-quantity"
                                    >
                                        +
                                    </Button>
                                </div>
                                <InputError
                                    message={errors.quantity}
                                    data-testid="error-job-quantity"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label
                                    htmlFor="job-gender"
                                    id="job-gender-label"
                                >
                                    Gender requirement
                                </Label>
                                <ToggleGroup
                                    type="single"
                                    variant="outline"
                                    value={form.gender}
                                    onValueChange={(value) => {
                                        if (value) {
                                            setField(
                                                'gender',
                                                value as GenderRequirement,
                                            );
                                        }
                                    }}
                                    aria-labelledby="job-gender-label"
                                    data-field="gender"
                                    data-testid="toggle-job-gender"
                                    className="w-fit"
                                >
                                    {(
                                        Object.keys(
                                            GENDER_LABELS,
                                        ) as GenderRequirement[]
                                    ).map((value) => (
                                        <ToggleGroupItem
                                            key={value}
                                            value={value}
                                            className="px-3 py-1.5 text-xs"
                                            data-testid={`toggle-job-gender-${value}`}
                                        >
                                            {GENDER_LABELS[value]}
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                            </div>
                        </FormSection>

                        <FormSection
                            step={4}
                            title="Requirements"
                            description="What applicants need to qualify."
                            icon={SlidersHorizontal}
                            collapsible
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="job-min-experience">
                                        Min experience (years)
                                    </Label>
                                    <Input
                                        id="job-min-experience"
                                        type="number"
                                        min={0}
                                        inputMode="numeric"
                                        value={form.minExperienceYears}
                                        onChange={(event) =>
                                            setField(
                                                'minExperienceYears',
                                                Number.parseInt(
                                                    event.target.value,
                                                    10,
                                                ) || 0,
                                            )
                                        }
                                        placeholder="0 for no minimum"
                                        data-testid="input-job-min-experience"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="job-max-experience">
                                        Max experience (years)
                                    </Label>
                                    <Input
                                        id="job-max-experience"
                                        type="number"
                                        min={0}
                                        inputMode="numeric"
                                        value={form.maxExperienceYears}
                                        onChange={(event) =>
                                            setField(
                                                'maxExperienceYears',
                                                Number.parseInt(
                                                    event.target.value,
                                                    10,
                                                ) || 0,
                                            )
                                        }
                                        placeholder="0 for no maximum"
                                        aria-invalid={Boolean(
                                            errors.maxExperienceYears,
                                        )}
                                        data-field="maxExperienceYears"
                                        data-testid="input-job-max-experience"
                                    />
                                    <InputError
                                        message={errors.maxExperienceYears}
                                        data-testid="error-job-max-experience"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="job-education">
                                        Education
                                    </Label>
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
                                            data-field="education"
                                            data-testid="select-job-education"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(
                                                Object.keys(
                                                    EDUCATION_LABELS,
                                                ) as EducationLevel[]
                                            ).map((level) => (
                                                <SelectItem
                                                    key={level}
                                                    value={level}
                                                >
                                                    {EDUCATION_LABELS[level]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="job-contract">
                                        Contract duration
                                    </Label>
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
                                            data-field="contractDuration"
                                            data-testid="select-job-contract"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(
                                                Object.keys(
                                                    CONTRACT_LABELS,
                                                ) as ContractDuration[]
                                            ).map((value) => (
                                                <SelectItem
                                                    key={value}
                                                    value={value}
                                                >
                                                    {CONTRACT_LABELS[value]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <span className="text-sm font-medium">
                                    Languages
                                </span>
                                {form.languages.map((entry, index) => (
                                    <div
                                        key={`${entry.language}-${index}`}
                                        className="flex flex-wrap items-center gap-2"
                                    >
                                        <Select
                                            value={entry.language}
                                            onValueChange={(value) => {
                                                const next = [
                                                    ...form.languages,
                                                ];

                                                next[index] = {
                                                    ...entry,
                                                    language: value,
                                                };
                                                setField('languages', next);
                                            }}
                                        >
                                            <SelectTrigger
                                                className="w-44"
                                                aria-label={`Language ${index + 1}`}
                                                data-testid={`select-language-${index}`}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {LANGUAGE_OPTIONS.filter(
                                                    (option) =>
                                                        !form.languages.some(
                                                            (item) =>
                                                                item.language ===
                                                                    option &&
                                                                index !==
                                                                    form.languages.indexOf(
                                                                        item,
                                                                    ),
                                                        ) ||
                                                        option ===
                                                            entry.language,
                                                ).map((option) => (
                                                    <SelectItem
                                                        key={option}
                                                        value={option}
                                                    >
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={entry.proficiency}
                                            onValueChange={(value) => {
                                                const next = [
                                                    ...form.languages,
                                                ];

                                                next[index] = {
                                                    ...entry,
                                                    proficiency:
                                                        value as LanguageProficiency,
                                                };
                                                setField('languages', next);
                                            }}
                                        >
                                            <SelectTrigger
                                                className="w-40"
                                                aria-label={`Proficiency for ${entry.language}`}
                                                data-testid={`select-proficiency-${index}`}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(
                                                    Object.keys(
                                                        PROFICIENCY_LABELS,
                                                    ) as LanguageProficiency[]
                                                ).map((value) => (
                                                    <SelectItem
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {
                                                            PROFICIENCY_LABELS[
                                                                value
                                                            ]
                                                        }
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            type="button"
                                            onClick={() =>
                                                setField(
                                                    'languages',
                                                    form.languages.filter(
                                                        (_, itemIndex) =>
                                                            itemIndex !== index,
                                                    ),
                                                )
                                            }
                                            aria-label={`Remove ${entry.language}`}
                                            data-testid={`button-remove-language-${index}`}
                                        >
                                            <Trash2
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    type="button"
                                    className="self-start"
                                    disabled={
                                        form.languages.length >=
                                        LANGUAGE_OPTIONS.length
                                    }
                                    onClick={() =>
                                        setField('languages', [
                                            ...form.languages,
                                            {
                                                language:
                                                    LANGUAGE_OPTIONS.find(
                                                        (option) =>
                                                            !form.languages.some(
                                                                (item) =>
                                                                    item.language ===
                                                                    option,
                                                            ),
                                                    ) ?? 'English',
                                                proficiency: 'conversational',
                                            },
                                        ])
                                    }
                                    data-testid="button-add-language"
                                >
                                    <Plus aria-hidden="true" />
                                    Add language
                                </Button>
                            </div>

                            <div className="flex flex-col gap-2">
                                <span className="text-sm font-medium">
                                    Preferred age range
                                </span>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min={18}
                                        max={70}
                                        value={form.ageMin}
                                        onChange={(event) =>
                                            setField(
                                                'ageMin',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Min"
                                        aria-label="Minimum age"
                                        className="w-28"
                                        data-testid="input-job-age-min"
                                    />
                                    <span
                                        className="text-[var(--slate)]"
                                        aria-hidden="true"
                                    >
                                        to
                                    </span>
                                    <Input
                                        type="number"
                                        min={18}
                                        max={70}
                                        value={form.ageMax}
                                        onChange={(event) =>
                                            setField(
                                                'ageMax',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Max"
                                        aria-label="Maximum age"
                                        aria-invalid={Boolean(errors.ageMax)}
                                        data-field="ageMax"
                                        className="w-28"
                                        data-testid="input-job-age-max"
                                    />
                                    <InputError
                                        message={errors.ageMax}
                                        data-testid="error-job-age-max"
                                    />
                                </div>
                                <p className="text-xs text-[var(--slate)]">
                                    Leave both blank for no age preference.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
                                <div>
                                    <span className="text-sm font-semibold text-[var(--navy)]">
                                        Listing flags
                                    </span>
                                    <p className="text-xs text-[var(--slate)]">
                                        Flags are optional. They add a badge to
                                        the listing so it stands out on the Jobs
                                        page.
                                    </p>
                                </div>
                                <label
                                    htmlFor="job-featured"
                                    className="flex cursor-pointer items-center gap-2 text-sm text-[var(--navy)]"
                                >
                                    <input
                                        id="job-featured"
                                        type="checkbox"
                                        checked={form.featured}
                                        onChange={(event) =>
                                            setField(
                                                'featured',
                                                event.target.checked,
                                            )
                                        }
                                        className="size-4 accent-[var(--teal)]"
                                        data-testid="checkbox-job-featured"
                                    />
                                    Featured — show a
                                    <span className="font-medium">
                                        Featured
                                    </span>{' '}
                                    badge
                                </label>
                                <label
                                    htmlFor="job-urgent"
                                    className="flex cursor-pointer items-center gap-2 text-sm text-[var(--navy)]"
                                >
                                    <input
                                        id="job-urgent"
                                        type="checkbox"
                                        checked={form.urgent}
                                        onChange={(event) =>
                                            setField(
                                                'urgent',
                                                event.target.checked,
                                            )
                                        }
                                        className="size-4 accent-[var(--teal)]"
                                        data-testid="checkbox-job-urgent"
                                    />
                                    Urgent — show an
                                    <span className="font-medium">
                                        Urgent
                                    </span>{' '}
                                    badge
                                </label>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div>
                                    <span className="text-sm font-semibold text-[var(--navy)]">
                                        Custom questions
                                    </span>
                                    <p className="text-xs text-[var(--slate)]">
                                        Choose an answer type, mark it required
                                        if the applicant must answer, then leave
                                        the answer blank to skip the question.
                                    </p>
                                </div>
                                {form.questions.map((question, index) => (
                                    <div
                                        key={question.id}
                                        className="flex flex-col gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-3"
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={question.label}
                                                onChange={(event) =>
                                                    updateQuestion(index, {
                                                        label: event.target
                                                            .value,
                                                    })
                                                }
                                                placeholder="e.g. Are you willing to relocate?"
                                                aria-label={`Custom question ${index + 1}`}
                                                className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                                                data-testid={`input-question-label-${index}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeQuestion(question.id)
                                                }
                                                aria-label={`Remove custom question ${index + 1}`}
                                                className="rounded-md p-2 text-[var(--slate)] transition-colors hover:bg-[var(--surface-soft)] hover:text-destructive focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                                                data-testid={`button-remove-question-${index}`}
                                            >
                                                <Trash2
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        </div>
                                        <Select
                                            value={question.type}
                                            onValueChange={(value) =>
                                                updateQuestion(index, {
                                                    type: value as QuestionAnswerType,
                                                    answer: '',
                                                })
                                            }
                                        >
                                            <SelectTrigger
                                                className="w-full bg-white"
                                                aria-label={`Answer type for ${question.label || `question ${index + 1}`}`}
                                                data-testid={`select-question-type-${index}`}
                                            >
                                                <SelectValue placeholder="Choose an answer type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {QUESTION_ANSWER_TYPES.map(
                                                    (option) => (
                                                        <SelectItem
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <label
                                            htmlFor={`question-required-${index}`}
                                            className="flex w-fit cursor-pointer items-center gap-2 text-xs font-medium text-[var(--navy)]"
                                        >
                                            <input
                                                id={`question-required-${index}`}
                                                type="checkbox"
                                                checked={question.required}
                                                onChange={(event) =>
                                                    updateQuestion(index, {
                                                        required:
                                                            event.target
                                                                .checked,
                                                    })
                                                }
                                                className="size-4 accent-[var(--teal)]"
                                                data-testid={`checkbox-question-required-${index}`}
                                            />
                                            Required to apply
                                            <span className="text-[var(--slate)]">
                                                Applicants cannot continue
                                                without answering
                                            </span>
                                        </label>
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
                                                    className="w-full bg-white"
                                                    aria-label={`Answer for ${question.label || `question ${index + 1}`}`}
                                                    data-testid={`select-question-answer-${index}`}
                                                >
                                                    <SelectValue placeholder="Choose an answer" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Yes">
                                                        Yes
                                                    </SelectItem>
                                                    <SelectItem value="No">
                                                        No
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : question.type === 'short' ? (
                                            <input
                                                type="text"
                                                value={question.answer}
                                                onChange={(event) =>
                                                    updateQuestion(index, {
                                                        answer: event.target
                                                            .value,
                                                    })
                                                }
                                                placeholder="Short answer goes here"
                                                aria-label={`Answer for ${question.label || `question ${index + 1}`}`}
                                                className="min-w-0 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                                                data-testid={`input-question-answer-${index}`}
                                            />
                                        ) : (
                                            <textarea
                                                rows={3}
                                                value={question.answer}
                                                onChange={(event) =>
                                                    updateQuestion(index, {
                                                        answer: event.target
                                                            .value,
                                                    })
                                                }
                                                placeholder="Let the applicant explain in their own words…"
                                                aria-label={`Answer for ${question.label || `question ${index + 1}`}`}
                                                className="min-w-0 resize-y rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                                                data-testid={`textarea-question-answer-${index}`}
                                            />
                                        )}
                                    </div>
                                ))}
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    type="button"
                                    onClick={addQuestion}
                                    className="self-start"
                                    data-testid="button-add-question"
                                >
                                    <Plus aria-hidden="true" />
                                    Add question
                                </Button>
                            </div>
                        </FormSection>
                    </form>

                    <div className="xl:col-span-2">
                        <ApplicantPreview form={form} />
                    </div>
                </div>

                <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--cream)]/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
                    <p className="text-xs text-[var(--slate)]">
                        {duplicates.length > 0 ? (
                            <span className="font-medium text-[var(--navy)]">
                                A similar listing already exists
                            </span>
                        ) : (
                            'All fields marked with * are required.'
                        )}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" asChild>
                            <Link href={jobs()}>Cancel</Link>
                        </Button>
                        <Button
                            variant="secondary"
                            type="submit"
                            form="form-new-job"
                            data-intent="draft"
                            data-testid="button-save-draft"
                        >
                            Save as draft
                        </Button>
                        <Button
                            type="submit"
                            form="form-new-job"
                            data-intent="publish"
                            data-testid="button-publish-job"
                        >
                            Publish listing
                        </Button>
                    </div>
                </div>
            </DashboardPage>

            <Dialog open={employerOpen} onOpenChange={setEmployerOpen}>
                <DialogContent>
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
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="employer-name">
                                Employer name *
                            </Label>
                            <Input
                                id="employer-name"
                                required
                                value={employerDraft.name}
                                onChange={(event) => {
                                    setEmployerDraft((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }));
                                    setEmployerError('');
                                }}
                                placeholder="e.g. NMC Healthcare"
                                data-testid="input-employer-name"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="employer-location">
                                Location *
                            </Label>
                            <Input
                                id="employer-location"
                                required
                                value={employerDraft.location}
                                onChange={(event) => {
                                    setEmployerDraft((current) => ({
                                        ...current,
                                        location: event.target.value,
                                    }));
                                    setEmployerError('');
                                }}
                                placeholder="City, country"
                                data-testid="input-employer-location"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="employer-license">
                                POEA / DMW licence no. *
                            </Label>
                            <Input
                                id="employer-license"
                                required
                                value={employerDraft.poeaLicenseNo}
                                onChange={(event) => {
                                    setEmployerDraft((current) => ({
                                        ...current,
                                        poeaLicenseNo: event.target.value,
                                    }));
                                    setEmployerError('');
                                }}
                                placeholder="e.g. DMW-2287-AE"
                                data-testid="input-employer-license"
                            />
                        </div>
                        {employerError && (
                            <p
                                className="text-sm font-medium text-destructive"
                                role="alert"
                                data-testid="error-employer"
                            >
                                {employerError}
                            </p>
                        )}
                        <DialogFooter>
                            <Button
                                variant="secondary"
                                type="button"
                                onClick={() => setEmployerOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
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

/**
 * Shows how the listing will look to applicants. Built inside the
 * dashboard page so the applicant-side card components stay untouched.
 */
function ApplicantPreview({ form }: { form: JobForm }) {
    const employer = form.employer ? getEmployer(form.employer) : undefined;

    // Built from the same fields the listing will carry, then read through
    // the same redaction helper the applicant pages use, so the preview can
    // never promise something the applicant will not actually see.
    const draftJob = {
        employer: form.employer,
        employerLocation: employer?.location ?? '',
        poeaLicenseNo: employer?.poeaLicenseNo ?? '',
        location: employer?.location ?? '',
        postingType: form.postingType,
    };
    const publicEmployer = getPublicEmployer(draftJob);
    const isManpooling = publicEmployer === null;
    const publicLocation = getPublicLocation(draftJob);

    return (
        <Card className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-hidden">
            <div className="xl:overflow-y-auto xl:overscroll-contain">
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <CardTitle>Applicant preview</CardTitle>
                            <CardDescription className="mt-1">
                                How this listing appears to applicants.
                            </CardDescription>
                        </div>
                        {isManpooling && (
                            <span
                                className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-0.5 text-xs font-medium text-[var(--navy)]"
                                data-testid="preview-manpooling-badge"
                            >
                                Manpooling
                            </span>
                        )}
                    </div>
                </CardHeader>
                <CardContent
                    className="flex flex-col gap-4"
                    data-testid="applicant-preview"
                >
                    <div>
                        <span className="text-xs font-medium text-[var(--slate)]">
                            Company
                        </span>
                        {isManpooling ? (
                            <p
                                className="flex items-center gap-1.5 text-sm text-[var(--slate)]"
                                data-testid="preview-company-hidden"
                            >
                                Confidential employer — not shown to applicants
                            </p>
                        ) : (
                            <p
                                className="text-sm font-semibold text-[var(--navy)]"
                                data-testid="preview-company"
                            >
                                {publicEmployer?.name ?? '—'}
                            </p>
                        )}
                    </div>

                    <div>
                        <span className="text-xs font-medium text-[var(--slate)]">
                            Location
                        </span>
                        {isManpooling ? (
                            <p
                                className="flex items-center gap-1.5 text-sm text-[var(--navy)]"
                                data-testid="preview-location-hidden"
                            >
                                {publicLocation || '—'}
                                <span className="text-[var(--slate)]">
                                    (destination only)
                                </span>
                            </p>
                        ) : (
                            <p
                                className="text-sm text-[var(--navy)]"
                                data-testid="preview-location"
                            >
                                {publicEmployer?.location ?? '—'}
                            </p>
                        )}
                    </div>

                    <div>
                        <span className="text-xs font-medium text-[var(--slate)]">
                            Position
                        </span>
                        <p
                            className="text-sm font-semibold text-[var(--navy)]"
                            data-testid="preview-title"
                        >
                            {form.title || 'Untitled position'}
                        </p>
                    </div>

                    <div>
                        <span className="text-xs font-medium text-[var(--slate)]">
                            Salary range
                        </span>
                        <p
                            className="text-sm text-[var(--navy)]"
                            data-testid="preview-salary"
                        >
                            {form.salary || 'Competitive salary'}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <span className="text-xs font-medium text-[var(--slate)]">
                                Vacant positions
                            </span>
                            <p
                                className="text-sm text-[var(--navy)] tabular-nums"
                                data-testid="preview-quantity"
                            >
                                {form.quantity}
                            </p>
                        </div>
                        <div>
                            <span className="text-xs font-medium text-[var(--slate)]">
                                Gender
                            </span>
                            <p
                                className="text-sm text-[var(--navy)]"
                                data-testid="preview-gender"
                            >
                                {GENDER_LABELS[form.gender]}
                            </p>
                        </div>
                    </div>

                    {(experienceRangeText(
                        form.minExperienceYears,
                        form.maxExperienceYears,
                    ) ||
                        ageRangeText(form.ageMin, form.ageMax)) && (
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-[var(--slate)]">
                                Requirements
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {experienceRangeText(
                                    form.minExperienceYears,
                                    form.maxExperienceYears,
                                ) && (
                                    <span
                                        className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-0.5 text-xs text-[var(--navy)]"
                                        data-testid="preview-experience-chip"
                                    >
                                        {experienceRangeText(
                                            form.minExperienceYears,
                                            form.maxExperienceYears,
                                        )}
                                    </span>
                                )}
                                {ageRangeText(form.ageMin, form.ageMax) && (
                                    <span
                                        className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-0.5 text-xs text-[var(--navy)]"
                                        data-testid="preview-age-chip"
                                    >
                                        {ageRangeText(form.ageMin, form.ageMax)}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <span className="text-xs font-medium text-[var(--slate)]">
                            Category
                        </span>
                        <p
                            className="text-sm text-[var(--navy)]"
                            data-testid="preview-category"
                        >
                            {form.category || '—'}
                            {form.subCategory ? (
                                <span className="text-[var(--slate)]">
                                    {' '}
                                    / {form.subCategory}
                                </span>
                            ) : null}
                        </p>
                    </div>

                    <div>
                        <span className="text-xs font-medium text-[var(--slate)]">
                            Agency
                        </span>
                        <p
                            className="text-sm text-[var(--navy)]"
                            data-testid="preview-agency"
                        >
                            {form.agency || '—'}
                        </p>
                    </div>

                    {publicEmployer && (
                        <div>
                            <span className="text-xs font-medium text-[var(--slate)]">
                                POEA / DMW licence
                            </span>
                            <p
                                className="text-sm text-[var(--navy)]"
                                data-testid="preview-license"
                            >
                                {publicEmployer.poeaLicenseNo}
                            </p>
                        </div>
                    )}

                    {(form.ageMin || form.ageMax) && (
                        <div>
                            <span className="text-xs font-medium text-[var(--slate)]">
                                Age preference
                            </span>
                            <p
                                className="text-sm text-[var(--navy)]"
                                data-testid="preview-age-detail"
                            >
                                {ageRangeText(form.ageMin, form.ageMax)} years
                                old
                            </p>
                        </div>
                    )}

                    {form.questions.filter((question) => question.label.trim())
                        .length > 0 && (
                        <div>
                            <span className="text-xs font-medium text-[var(--slate)]">
                                Questions the applicant must answer
                            </span>
                            <ul
                                className="mt-1 grid gap-1"
                                data-testid="preview-questions"
                            >
                                {form.questions
                                    .filter((question) => question.required)
                                    .map((question) => (
                                        <li
                                            key={question.id}
                                            className="text-sm text-[var(--navy)]"
                                        >
                                            {question.label.trim() ||
                                                'Untitled question'}
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    )}

                    {form.description.trim() && (
                        <div>
                            <span className="text-xs font-medium text-[var(--slate)]">
                                About this role
                            </span>
                            <p
                                className="text-sm leading-relaxed text-[var(--navy)]"
                                data-testid="preview-description"
                            >
                                {form.description.trim()}
                            </p>
                        </div>
                    )}

                    {form.closingDate && (
                        <div>
                            <span className="text-xs font-medium text-[var(--slate)]">
                                Closing date
                            </span>
                            <p
                                className="text-sm text-[var(--navy)]"
                                data-testid="preview-closing-date"
                            >
                                {new Date(
                                    `${form.closingDate}T12:00:00`,
                                ).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </p>
                        </div>
                    )}

                    {(form.minExperienceYears > 0 ||
                        form.maxExperienceYears > 0) && (
                        <div>
                            <span className="text-xs font-medium text-[var(--slate)]">
                                Experience
                            </span>
                            <p
                                className="text-sm text-[var(--navy)]"
                                data-testid="preview-experience"
                            >
                                {form.minExperienceYears > 0 &&
                                form.maxExperienceYears > 0
                                    ? `${form.minExperienceYears}–${form.maxExperienceYears} years`
                                    : form.minExperienceYears > 0
                                      ? `${form.minExperienceYears} years and up`
                                      : `Up to ${form.maxExperienceYears} years`}
                            </p>
                        </div>
                    )}

                    {form.education !== 'any' && (
                        <div>
                            <span className="text-xs font-medium text-[var(--slate)]">
                                Education
                            </span>
                            <p
                                className="text-sm text-[var(--navy)]"
                                data-testid="preview-education"
                            >
                                {EDUCATION_LABELS[form.education]}
                            </p>
                        </div>
                    )}

                    {form.languages.length > 0 && (
                        <div>
                            <span className="text-xs font-medium text-[var(--slate)]">
                                Languages
                            </span>
                            <p
                                className="text-sm text-[var(--navy)]"
                                data-testid="preview-languages"
                            >
                                {form.languages
                                    .map(
                                        (entry) =>
                                            `${entry.language} (${PROFICIENCY_LABELS[entry.proficiency]})`,
                                    )
                                    .join(', ')}
                            </p>
                        </div>
                    )}

                    {(form.ageMin || form.ageMax) && (
                        <div>
                            <span className="text-xs font-medium text-[var(--slate)]">
                                Preferred age
                            </span>
                            <p
                                className="text-sm text-[var(--navy)]"
                                data-testid="preview-age"
                            >
                                {form.ageMin && form.ageMax
                                    ? `${form.ageMin}–${form.ageMax}`
                                    : form.ageMin
                                      ? `${form.ageMin} and up`
                                      : `Up to ${form.ageMax}`}
                            </p>
                        </div>
                    )}

                    {form.benefits.length > 0 && (
                        <div>
                            <span className="text-xs font-medium text-[var(--slate)]">
                                Benefits
                            </span>
                            <div
                                className="mt-1 flex flex-wrap gap-1"
                                data-testid="preview-benefits"
                            >
                                {form.benefits.map((benefit) => (
                                    <span
                                        key={benefit}
                                        className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-0.5 text-xs text-[var(--navy)]"
                                    >
                                        {benefit}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {form.contactName.trim() && (
                        <div>
                            <span className="text-xs font-medium text-[var(--slate)]">
                                Contact
                            </span>
                            <p
                                className="text-sm text-[var(--navy)]"
                                data-testid="preview-contact"
                            >
                                {form.contactName.trim()}
                                {form.contactEmail.trim() && (
                                    <span className="block text-xs text-[var(--slate)]">
                                        {form.contactEmail.trim()}
                                    </span>
                                )}
                            </p>
                        </div>
                    )}
                </CardContent>
            </div>
        </Card>
    );
}
