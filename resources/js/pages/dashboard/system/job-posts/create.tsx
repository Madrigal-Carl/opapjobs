import { Head, router } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Building2,
    BriefcaseBusiness,
    CircleHelp,
    ClipboardCheck,
    Phone,
    Plus,
} from 'lucide-react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
    useForm,
    type FieldErrors,
    type FieldPath,
    type FieldPathValue,
} from 'react-hook-form';
import { toast } from 'sonner';
import { FormSection } from '@/components/dashboard/form-section';
import { JobPostDocumentsField } from '@/components/dashboard/job-post-documents-field';
import { JobLocationCombobox } from '@/components/dashboard/job-location-combobox';
import { JobPostQuestionsField } from '@/components/dashboard/job-post-questions-field';
import { SystemPage } from '@/components/system/system-page';
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
import { SystemPageHeader } from '@/components/system/system-page-header';
import {
    CONTRACT_LABELS,
    EDUCATION_LABELS,
    GENDER_LABELS,
} from '@/data/job-attributes';
import {
    createJobFormSchema,
    emptyJobForm,
    type JobForm,
    type JobFormOptions,
    type JobPostCategory,
} from '@/data/job-form';
import {
    categorySubcategories,
    DISPLAY_STATUS_LABELS,
    jobPostDisplayStatus,
    todayIso,
    visibleAgencies,
} from '@/data/system/selectors';
import { commitSystemChange, useSystemState } from '@/data/system/store';
import type {
    AuditChange,
    JobPostQuestionRecord,
    JobPostRecord,
    OptionRecord,
} from '@/data/system/types';
import { cn } from '@/lib/utils';
import * as system from '@/routes/dashboard/system';
import { create as jobPostCreate } from '@/routes/dashboard/system/job-posts';
import type { Pathway } from '@/types/agency';

/**
 * Adding a job post from the Super Admin console (§4.5).
 *
 * The field set, labels and validation are the agency's post-a-job form
 * (`pages/dashboard/jobs/new.tsx` + `data/job-form.ts`) so a job post built
 * here obeys exactly the rules one built by an Agency obeys; the console-only
 * addition is the Agency picker in the first section, because in this console
 * nobody is signed in "as" an Agency.
 *
 * It is one stacked form rather than the stepped wizard used to add an
 * Agency: every section describes the same record and the zod schema
 * validates them together (`superRefine` covers job order ↔ recruitment type,
 * salary bounds and category → sub-category), so stepping would have to slice
 * a schema designed to run whole. The dependencies a wizard would reveal are
 * already progressive inside the form — the sub-category stays disabled until
 * a category is chosen, the pickers empty until an Agency is chosen.
 *
 * Saving writes to the in-memory console store only: no request leaves the
 * page, and the record starts `pending`, which `jobPostDisplayStatus` turns
 * into a display status from the closing date (§8.2).
 */

const inputClass =
    'h-9 min-w-0 px-3 py-0 text-sm text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40';
const selectClass =
    'h-9 w-full min-w-0 border-[var(--line)] bg-white text-sm text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40';
const labelClass = 'text-xs font-semibold text-[var(--navy)]';

/** Option lists the console config screen owns, in their stored order. */
function activeValues(records: OptionRecord[]): string[] {
    return records
        .filter((record) => record.active)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((record) => record.value);
}

/**
 * Keeps a configured list to the values this form's schema can parse. The
 * config screen may hold labels the schema was never typed against (the
 * seeded proficiency list, for one), so membership is checked rather than
 * asserted.
 */
function within<T extends string>(values: string[], allowed: T[]): T[] {
    const set = new Set<string>(allowed);
    return values.filter((value): value is T => set.has(value));
}

const CONTRACT_TYPES: JobFormOptions['contract_types'] = [
    'permanent',
    'fixed',
    'seasonal',
];
const EDUCATION_LEVELS: JobFormOptions['education_levels'] = [
    'secondary',
    'vocational',
    'bachelor',
    'master',
];
const GENDERS: JobFormOptions['genders'] = ['any', 'male', 'female'];
const RECRUITMENT_TYPES: JobFormOptions['recruitment_types'] = [
    'joborder',
    'manpooling',
];
const ANSWER_TYPES: JobFormOptions['answer_types'] = [
    'yesno',
    'short',
    'selection',
    'number',
];
const PROFICIENCY_LEVELS: JobFormOptions['proficiencies'] = [
    'basic',
    'conversational',
    'fluent',
];

type ContractChoice = JobFormOptions['contract_types'][number];
type EducationChoice = JobFormOptions['education_levels'][number];

/** Selects hand back a string; these keep the narrowing off the JSX. */
function isContractChoice(value: string): value is ContractChoice {
    return CONTRACT_TYPES.some((choice) => choice === value);
}

function isEducationChoice(value: string): value is EducationChoice {
    return EDUCATION_LEVELS.some((choice) => choice === value);
}

function pathwayLabel(pathway: Pathway): string {
    return pathway === 'landbased' ? 'Land-based' : 'Sea-based';
}

const nullable = (value: string): string | null => value.trim() || null;

const toNumber = (value: string): number | null =>
    value.trim() === '' ? null : Number(value.replaceAll(',', ''));

/** Labelled control with the message sitting directly under it. */
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
    /** Shown only while there is no error, so the two never compete. */
    hint?: ReactNode;
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
            {error ? (
                <InputError
                    id={`${id}-error`}
                    message={error}
                    role="alert"
                    className="mt-0"
                    data-testid={`error-${id}`}
                />
            ) : (
                hint && <p className="text-xs text-[var(--slate)]">{hint}</p>
            )}
        </div>
    );
}

export default function SystemJobPostCreate() {
    const state = useSystemState();
    const agencies = useMemo(
        () => visibleAgencies(state.agencies),
        [state.agencies],
    );
    const today = useMemo(() => todayIso(), []);

    // The Agency is not part of `JobForm` — the backend derives it from the
    // session — so in this console it is the page's own field, with its own
    // inline error.
    const [agencyId, setAgencyId] = useState<number | null>(null);
    const [agencyError, setAgencyError] = useState<string>();
    const creatingRef = useRef(false);
    const formRef = useRef<HTMLFormElement>(null);

    const agency =
        agencyId === null
            ? null
            : (agencies.find((entry) => entry.id === agencyId) ?? null);
    const pathway = agency?.pathway ?? null;

    const options: JobFormOptions = useMemo(() => {
        const lists = state.optionLists;

        return {
            currencies: activeValues(lists.currencies),
            languages: activeValues(lists.languages),
            contract_types: within(
                activeValues(lists.contract_types),
                CONTRACT_TYPES,
            ),
            education_levels: within(
                activeValues(lists.education_levels),
                EDUCATION_LEVELS,
            ),
            genders: within(activeValues(lists.gender_requirement), GENDERS),
            recruitment_types: within(
                activeValues(lists.recruitment_types),
                RECRUITMENT_TYPES,
            ),
            answer_types: within(
                activeValues(lists.question_answer_types),
                ANSWER_TYPES,
            ),
            proficiencies: within(
                activeValues(lists.language_proficiency),
                PROFICIENCY_LEVELS,
            ),
        };
    }, [state.optionLists]);

    /** Categories of the chosen Agency's pathway only (§8.2). */
    const categories: JobPostCategory[] = useMemo(() => {
        if (pathway === null) {
            return [];
        }

        return state.categories
            .filter(
                (category) =>
                    category.pathway === pathway && category.deletedAt === null,
            )
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((category) => ({
                id: category.id,
                name: category.categoryName,
                subcategories: categorySubcategories(state, category.id).map(
                    (subcategory) => ({
                        id: subcategory.id,
                        name: subcategory.subcategoryName,
                    }),
                ),
            }));
    }, [state, pathway]);

    const schema = useMemo(
        () => createJobFormSchema(options, today, categories),
        [options, today, categories],
    );

    const {
        control,
        register,
        watch,
        setValue,
        clearErrors,
        handleSubmit,
        formState: { errors: formErrors, isDirty },
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

    /** Ties a control to its inline message so focus can find it. */
    const invalid = (field: keyof JobForm, id: string) => ({
        'data-field': field,
        'aria-invalid': Boolean(errors[field]),
        'aria-describedby': errors[field] ? `${id}-error` : undefined,
    });

    const subCategoryOptions =
        categories.find((category) => category.id === form.categoryId)
            ?.subcategories ?? [];

    /** Anything edited — the Agency counts too, though it is not in the schema. */
    const dirty = isDirty || agencyId !== null;

    const setField = <K extends FieldPath<JobForm>>(
        field: K,
        value: FieldPathValue<JobForm, K>,
    ) => {
        setValue(field, value, { shouldDirty: true });
        clearErrors(field);
    };

    const changeAgency = (value: string) => {
        setAgencyError(undefined);
        setAgencyId(value === '' ? null : Number(value));
        // Categories belong to one Agency, so a new choice sends both
        // pickers back to their starting point.
        setField('categoryId', null);
        setField('subcategoryId', null);
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

    const formatSalaryOnBlur = (field: 'salaryMin' | 'salaryMax') => {
        if (/^\d+(?:,\d{3})*$/.test(form[field])) {
            setField(
                field,
                Number(form[field].replaceAll(',', '')).toLocaleString('en-US'),
            );
        }
    };

    function save(values: JobForm) {
        if (creatingRef.current) {
            return;
        }

        // The select only offers visible Agencies, so a null here means the
        // field was never chosen.
        if (agency === null) {
            setAgencyError('Choose the Agency this job post belongs to.');
            return;
        }

        // The schema rejects an empty education level and a missing
        // sub-category before `save` runs; the guards only narrow the
        // validated values for the record.
        if (values.education === '' || values.subcategoryId === null) {
            return;
        }

        creatingRef.current = true;

        const id = state.nextId;
        const now = new Date().toISOString();
        const title = values.title.trim();
        // The record has no columns for these two yet, so they ride on the
        // audit row rather than being dropped without a trace.
        const jobOrderNumber =
            values.postingType === 'joborder' &&
            values.jobOrderNumber.trim() !== ''
                ? values.jobOrderNumber.trim()
                : null;
        const requiredDocuments = values.requiredDocuments
            .map((document) => document.trim())
            .filter((document) => document !== '');

        const record: JobPostRecord = {
            id,
            agencyId: agency.id,
            // `posted_by_user_id` must belong to the Agency (§8.2), so the
            // job post is filed under the Agency's admin.
            postedByUserId: agency.adminUserId ?? 1,
            recruitmentType: values.postingType,
            jobTitle: title,
            jobSubcategoryId: values.subcategoryId,
            workLocation: values.location.trim(),
            vacantPositions: values.quantity,
            contractType: values.contractDuration,
            salaryCurrency: nullable(values.salaryCurrency),
            monthlySalaryMin: toNumber(values.salaryMin),
            monthlySalaryMax: toNumber(values.salaryMax),
            educationLevel: values.education,
            minExperienceYears: toNumber(values.minExperienceYears),
            maxExperienceYears: toNumber(values.maxExperienceYears),
            genderRequirement: values.gender,
            jobDescription: values.description.trim(),
            otherRequirements: nullable(values.otherRequirements),
            applicationInstructions: nullable(values.applyInstructions),
            contactPersonName: nullable(values.contactName),
            contactEmail: nullable(values.contactEmail),
            contactPhone: nullable(values.contactPhone),
            status: 'pending',
            closingDate: values.closingDate === '' ? null : values.closingDate,
            isUrgent: values.urgent,
            languages: values.languages.map(({ language, proficiency }) => ({
                language,
                proficiency,
            })),
            createdAt: now,
            updatedAt: now,
        };

        const questions: JobPostQuestionRecord[] = values.questions.map(
            (question, index) => ({
                id: id + 1 + index,
                jobPostId: id,
                questionText: question.label.trim(),
                answerType: question.type,
                options:
                    question.type === 'selection'
                        ? question.options?.map((choice) => choice.trim())
                        : [],
                expectedAnswer:
                    question.type === 'yesno'
                        ? nullable(question.answer.toLowerCase())
                        : null,
                isRequired: question.required,
                sortOrder: index,
                answerCount: 0,
                deletedAt: null,
            }),
        );

        const changes: AuditChange[] = [
            { field: 'Job post', from: null, to: title },
            { field: 'Agency', from: null, to: agency.agencyName },
            {
                field: 'Recruitment type',
                from: null,
                to:
                    values.postingType === 'joborder'
                        ? 'Job order'
                        : 'Manpooling',
            },
        ];

        if (record.closingDate !== null) {
            changes.push({
                field: 'Closing date',
                from: null,
                to: record.closingDate,
            });
        }

        if (jobOrderNumber !== null) {
            changes.push({
                field: 'Job order number',
                from: null,
                to: jobOrderNumber,
            });
        }

        if (requiredDocuments.length > 0) {
            changes.push({
                field: 'Required documents',
                from: null,
                to: requiredDocuments.join(', '),
            });
        }

        if (questions.length > 0) {
            changes.push({
                field: 'Screening questions',
                from: 0,
                to: questions.length,
            });
        }

        commitSystemChange({
            action: 'create',
            subjectType: 'job_post',
            subjectId: id,
            subjectLabel: title,
            changes,
            apply: (current) => ({
                ...current,
                nextId: current.nextId + 1 + questions.length,
                jobPosts: [...current.jobPosts, record],
                jobPostQuestions: [...current.jobPostQuestions, ...questions],
            }),
        });

        // Creation has no Undo: the record is live from here, so the toast
        // says what a reader will see on the list.
        const displayStatus = jobPostDisplayStatus(record, today);
        toast.success(
            `“${title}” added to ${agency.agencyName}. It shows as ${DISPLAY_STATUS_LABELS[displayStatus]}.`,
        );
        router.get(system.jobPosts().url, undefined, {
            onFinish: () => {
                creatingRef.current = false;
            },
        });
    }

    return (
        <>
            <Head title="Add job post" />

            <SystemPage>
                <SystemPageHeader
                    title="Add job post"
                    subtitle="Choose the Agency first — its pathway decides which categories and sub-categories this job post can offer."
                    data-testid="header-job-post-create"
                />

                <form
                    ref={formRef}
                    id="form-job-post-create"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (agencyId === null) {
                            setAgencyError(
                                'Choose the Agency this job post belongs to.',
                            );
                            requestAnimationFrame(() => {
                                document.getElementById('job-agency')?.focus();
                            });
                        }
                        void handleSubmit(save, (fieldErrors) =>
                            focusFirstError(fieldErrors),
                        )(event);
                    }}
                    className="flex w-full flex-col gap-5"
                    data-testid="form-job-post-create"
                >
                    <FormSection
                        step={1}
                        title="Agency"
                        description="Who this job post is filed under, and where its categories come from."
                        icon={Building2}
                    >
                        <JobField
                            id="job-agency"
                            label="Agency"
                            required
                            error={agencyError}
                            hint={
                                agency === null
                                    ? 'Choose the Agency first: only its pathway’s categories are offered below.'
                                    : `Pathway: ${pathwayLabel(agency.pathway)}. A job post can only use sub-categories of this pathway.`
                            }
                        >
                            <Select
                                value={
                                    agencyId === null ? '' : String(agencyId)
                                }
                                onValueChange={changeAgency}
                            >
                                <SelectTrigger
                                    id="job-agency"
                                    aria-required
                                    aria-invalid={agencyError !== undefined}
                                    aria-describedby={
                                        agencyError
                                            ? 'job-agency-error'
                                            : undefined
                                    }
                                    className={selectClass}
                                    data-testid="select-job-post-agency-new"
                                >
                                    <SelectValue placeholder="Choose an Agency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {agencies.map((entry) => (
                                        <SelectItem
                                            key={entry.id}
                                            value={String(entry.id)}
                                            data-testid={`agency-option-${entry.id}`}
                                        >
                                            {entry.agencyName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </JobField>
                    </FormSection>

                    <FormSection
                        step={2}
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
                                    data-testid="segmented-job-post-recruitment"
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
                                data-testid="input-job-post-title"
                            />
                        </JobField>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <JobField
                                id="job-category"
                                label="Category"
                                required
                                error={errors.categoryId}
                                hint={
                                    agencyId === null
                                        ? 'Choose an Agency first.'
                                        : undefined
                                }
                            >
                                <Select
                                    value={form.categoryId?.toString() ?? ''}
                                    onValueChange={changeCategory}
                                    disabled={agencyId === null}
                                >
                                    <SelectTrigger
                                        id="job-category"
                                        aria-required
                                        {...invalid(
                                            'categoryId',
                                            'job-category',
                                        )}
                                        className={selectClass}
                                        data-testid="select-job-post-category-new"
                                    >
                                        <SelectValue
                                            placeholder={
                                                agencyId === null
                                                    ? 'Choose an Agency first'
                                                    : 'Choose a category'
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((category) => (
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
                                    value={form.subcategoryId?.toString() ?? ''}
                                    onValueChange={(value) =>
                                        setField('subcategoryId', Number(value))
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
                                        data-testid="select-job-post-subcategory-new"
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
                            <JobLocationCombobox
                                id="job-location"
                                required
                                value={form.location}
                                onChange={(value) =>
                                    setField('location', value)
                                }
                                {...invalid('location', 'job-location')}
                                className={inputClass}
                                data-testid="input-job-post-location"
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
                                        setField('quantity', value)
                                    }
                                    {...invalid('quantity', 'job-quantity')}
                                    data-testid="input-job-post-quantity"
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
                                    onValueChange={(value) => {
                                        if (isContractChoice(value)) {
                                            setField('contractDuration', value);
                                        }
                                    }}
                                >
                                    <SelectTrigger
                                        id="job-contract"
                                        aria-required
                                        {...invalid(
                                            'contractDuration',
                                            'job-contract',
                                        )}
                                        className={selectClass}
                                        data-testid="select-job-post-contract"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {options.contract_types.map((value) => (
                                            <SelectItem
                                                key={value}
                                                value={value}
                                                data-testid={`contract-option-${value}`}
                                            >
                                                {CONTRACT_LABELS[value]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </JobField>
                        </div>
                        {form.postingType === 'joborder' && (
                            <div className="grid gap-4">
                                <JobField
                                    id="job-order-number"
                                    label="Job order number"
                                    required
                                    error={errors.jobOrderNumber}
                                >
                                    <Input
                                        id="job-order-number"
                                        required
                                        value={form.jobOrderNumber}
                                        onChange={(event) =>
                                            setField(
                                                'jobOrderNumber',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="e.g. JO-2026-0184"
                                        {...invalid(
                                            'jobOrderNumber',
                                            'job-order-number',
                                        )}
                                        className={inputClass}
                                        data-testid="input-job-post-order-number"
                                    />
                                </JobField>
                            </div>
                        )}
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
                                            setField('salaryCurrency', value)
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
                                            data-testid="select-job-post-currency"
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
                                        data-testid="input-job-post-salary-min"
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
                                        data-testid="input-job-post-salary-max"
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
                                hint="Leave it empty and the job post never expires."
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
                                    data-testid="input-job-post-closing-date"
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
                                data-testid="input-job-post-description"
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
                                data-testid="checkbox-job-post-urgent"
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
                        step={3}
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
                                onValueChange={(value) => {
                                    if (isEducationChoice(value)) {
                                        setField('education', value);
                                    }
                                }}
                            >
                                <SelectTrigger
                                    id="job-education"
                                    aria-required
                                    {...invalid('education', 'job-education')}
                                    className={selectClass}
                                    data-testid="select-job-post-education"
                                >
                                    <SelectValue placeholder="Choose an education level" />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.education_levels.map((level) => (
                                        <SelectItem
                                            key={level}
                                            value={level}
                                            data-testid={`education-option-${level}`}
                                        >
                                            {EDUCATION_LABELS[level]}
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
                                        data-testid="input-job-post-min-experience"
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
                                        data-testid="input-job-post-max-experience"
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
                                    options={options.genders.map((value) => ({
                                        value,
                                        label: GENDER_LABELS[value],
                                    }))}
                                    aria-labelledby="job-gender-label"
                                    data-testid="segmented-job-post-gender"
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
                                {formErrors.languages?.map?.((entry, index) => (
                                    <InputError
                                        key={index}
                                        role="alert"
                                        message={
                                            entry?.language?.message ??
                                            entry?.proficiency?.message
                                        }
                                    />
                                ))}
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
                                data-testid="input-job-post-apply-instructions"
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
                                {...invalid(
                                    'otherRequirements',
                                    'job-other-requirements',
                                )}
                                aria-describedby={
                                    errors.otherRequirements
                                        ? 'other-requirements-hint job-other-requirements-error'
                                        : 'other-requirements-hint'
                                }
                                data-testid="input-job-post-other-requirements"
                            />
                            <InputError
                                id="job-other-requirements-error"
                                role="alert"
                                message={errors.otherRequirements}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <Label className={labelClass}>
                                    Required documents
                                </Label>
                                <span className="text-[11px] text-[var(--slate)]">
                                    What the applicant must submit
                                </span>
                            </div>
                            <p className="text-[11px] text-[var(--slate)]">
                                List the certificates, clearances and medical
                                results this vacancy needs. They appear on the
                                job page as what to prepare.
                            </p>
                            <JobPostDocumentsField
                                value={form.requiredDocuments}
                                onChange={(documents) =>
                                    setField('requiredDocuments', documents)
                                }
                                error={errors.requiredDocuments}
                            />
                        </div>
                    </FormSection>
                    <FormSection
                        step={4}
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
                        step={5}
                        title="Contact"
                        description="Who applicants should reach about this vacancy."
                        icon={Phone}
                        optional
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
                                    data-testid="input-job-post-contact-name"
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
                                    data-testid="input-job-post-contact-email"
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
                </form>
                <div
                    className="sticky bottom-0 z-10 -mx-4 flex min-h-[60px] flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-white px-4 py-3 md:-mx-6 md:px-6"
                    data-testid="job-post-create-action-bar"
                >
                    <div className="flex flex-wrap items-center gap-3">
                        {dirty && (
                            <span
                                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--teal-ink)]"
                                data-testid="note-job-post-unsaved"
                            >
                                <span
                                    className="size-1.5 rounded-full bg-[var(--teal)]"
                                    aria-hidden="true"
                                />
                                Unsaved changes
                            </span>
                        )}
                        <p className="text-xs text-[var(--slate)]">
                            All fields marked with{' '}
                            <span className="text-destructive">*</span> are
                            required.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 motion-reduce:transition-none"
                            onClick={() => router.get(system.jobPosts().url)}
                            data-testid="button-job-post-create-cancel"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="form-job-post-create"
                            variant="primary"
                            size="sm"
                            className="h-9 motion-reduce:transition-none"
                            disabled={!dirty}
                            data-testid="button-job-post-create"
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            Add job post
                        </Button>
                    </div>
                </div>
            </SystemPage>
        </>
    );
}

SystemJobPostCreate.layout = {
    breadcrumbs: [
        {
            title: 'Job posts',
            href: system.jobPosts(),
        },
        {
            title: 'Add job post',
            href: jobPostCreate(),
        },
    ],
};
