import { Head } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    Inbox,
    ListChecks,
    Lock,
    Pencil,
    Plus,
    SearchX,
    SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { StatusPill } from '@/components/dashboard/badges';
import type { Column } from '@/components/dashboard/data-table';
import {
    DataTable,
    DataTableField,
    DataTableRefreshButton,
    DataTableSearch,
    DataTableSelect,
    DataTableToolbar,
} from '@/components/dashboard/data-table';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
import { SystemPage } from '@/components/system/system-page';
import { BulkBar } from '@/components/system/bulk-bar';
import { ConfirmDialog } from '@/components/system/confirm-dialog';
import {
    EntitySheet,
    SheetSaveActions,
} from '@/components/system/entity-sheet';
import {
    ArchivedRow,
    ArchivedSection,
    InlineAddRow,
    RenameableBody,
    RenameArchiveMenu,
    ReorderControls,
    SearchBox,
    UsageCount,
} from '@/components/system/inline-list-row';
import { LockedField } from '@/components/system/locked-field';
import { SystemPageHeader } from '@/components/system/system-page-header';
import type { SystemPageAction } from '@/components/system/system-page-header';
import { SystemRowMenu } from '@/components/system/system-row-menu';
import type { SystemRowAction } from '@/components/system/system-row-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useFormChanges } from '@/hooks/use-form-changes';
import { useRowSelection } from '@/hooks/use-row-selection';
import { useSystemLoading } from '@/hooks/use-system-loading';
import { OPTION_LIST_KEYS } from '@/data/system/seeds/config';
import {
    commitSystemChange,
    nextSystemId,
    useSystemState,
} from '@/data/system/store';
import type { SystemState } from '@/data/system/store';
import type {
    AuditChange,
    CustomFieldRecord,
    FormFieldOwner,
    FormFieldRecord,
    OptionListKey,
    OptionRecord,
} from '@/data/system/types';
import * as system from '@/routes/dashboard/system';
import { cn } from '@/lib/utils';

/**
 * Fields and options (§4.10).
 *
 * Three related surfaces behind one screen: the option lists that back
 * every dropdown, the seeded fields on the four forms, and the custom
 * fields a superadmin can add without a code change.
 *
 * Vocabulary is edited inline exactly like Categories — add at the top,
 * rename, drag or move, archive — with a usage count on every option so the
 * archive impact is visible before the confirm. Form fields keep their
 * column key and type (each shown with `LockedField`, a real reason and the
 * way out) and only their presentation moves. Custom fields get the full
 * sheet treatment plus a tick-and-archive bulk flow.
 *
 * Everything lives in the in-memory store: every mutation goes through
 * `commitSystemChange` so the audit log records it, and each Undo toast
 * commits the inverse change.
 */

type Area = 'options' | 'form_fields' | 'custom_fields';

const AREA_OPTIONS: { value: Area; label: string }[] = [
    { value: 'options', label: 'Option lists' },
    { value: 'form_fields', label: 'Form fields' },
    { value: 'custom_fields', label: 'Custom fields' },
];

/** Human labels for every option list in the store. */
const OPTION_LIST_LABELS: Record<OptionListKey, string> = {
    application_stages: 'Application stages',
    availability: 'Availability',
    contract_types: 'Contract types',
    country_dial_codes: 'Country dial codes',
    currencies: 'Currencies',
    destination_countries: 'Destination countries',
    document_types: 'Document types',
    education_levels: 'Education levels',
    gender_requirement: 'Gender requirement',
    languages: 'Languages',
    language_proficiency: 'Language proficiency',
    question_answer_types: 'Question answer types',
    recruitment_types: 'Recruitment types',
    skill_levels: 'Skill levels',
};

/**
 * What the records that use an option are called, per list. `UsageCount`
 * pluralises the noun, so each list speaks about its own records rather
 * than guessing "job posts" everywhere.
 */
const OPTION_USAGE_NOUNS: Record<OptionListKey, string> = {
    application_stages: 'application',
    availability: 'record',
    contract_types: 'job post',
    country_dial_codes: 'record',
    currencies: 'job post',
    destination_countries: 'job post',
    document_types: 'document',
    education_levels: 'job post',
    gender_requirement: 'job post',
    languages: 'job post',
    language_proficiency: 'job post',
    question_answer_types: 'question',
    recruitment_types: 'job post',
    skill_levels: 'skill',
};

const OWNER_LABELS: Record<FormFieldOwner, string> = {
    agency_profile: 'Agency profile',
    applicant_profile: 'Applicant profile',
    application: 'Application',
    job_post: 'Job post',
};

type FieldOwnerFilter = 'all' | FormFieldOwner;

const OWNER_FILTER_OPTIONS: { value: FieldOwnerFilter; label: string }[] = [
    { value: 'all', label: 'All forms' },
    { value: 'job_post', label: 'Job post' },
    { value: 'agency_profile', label: 'Agency profile' },
    { value: 'applicant_profile', label: 'Applicant profile' },
    { value: 'application', label: 'Application' },
];

const CUSTOM_FIELD_TYPES: CustomFieldRecord['type'][] = [
    'short_text',
    'paragraph',
    'number',
    'date',
    'yes_no',
    'single_select',
    'multi_select',
];

const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldRecord['type'], string> = {
    date: 'Date',
    multi_select: 'Multi-select',
    number: 'Number',
    paragraph: 'Paragraph',
    short_text: 'Short text',
    single_select: 'Select',
    yes_no: 'Yes / No',
};

const CUSTOM_FIELD_TYPE_OPTIONS: { value: string; label: string }[] =
    CUSTOM_FIELD_TYPES.map((type) => ({
        value: type,
        label: CUSTOM_FIELD_TYPE_LABELS[type],
    }));

/** Presentation types that actually render a placeholder. */
const PLACEHOLDER_TYPES = new Set<string>([
    'date',
    'email',
    'number',
    'phone',
    'text',
    'textarea',
]);

/** Friendly names for the seeded system-field types (§6.1). */
const FIELD_TYPE_LABELS: Record<string, string> = {
    chips: 'Chips',
    date: 'Date',
    email: 'Email',
    file: 'File upload',
    number: 'Number',
    phone: 'Phone',
    richtext: 'Rich text',
    select: 'Dropdown',
    text: 'Text',
    textarea: 'Long text',
    toggle: 'Yes / No',
};

function fieldTypeLabel(type: string): string {
    return type in FIELD_TYPE_LABELS ? FIELD_TYPE_LABELS[type] : type;
}

function isOwner(value: string): value is FormFieldOwner {
    return (
        value === 'job_post' ||
        value === 'agency_profile' ||
        value === 'applicant_profile' ||
        value === 'application'
    );
}

function isCustomFieldType(value: string): value is CustomFieldRecord['type'] {
    return CUSTOM_FIELD_TYPES.some((type) => type === value);
}

/** True when another option in the same list already carries this label. */
function isDuplicateOptionLabel(
    options: OptionRecord[],
    label: string,
    exceptValue: string | null,
): boolean {
    const needle = label.trim().toLowerCase();

    return options.some(
        (option) =>
            option.value !== exceptValue &&
            option.active &&
            option.label.trim().toLowerCase() === needle,
    );
}

/**
 * A stable stored key for a new option, seeded from the label and made
 * unique inside its list. The key is what records store, so it never
 * changes afterwards — only the label is renamed.
 */
function optionValueFor(
    label: string,
    options: OptionRecord[],
    seed: number,
): string {
    const base =
        label
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'option';

    let candidate = base;
    let suffix = seed;

    while (options.some((option) => option.value === candidate)) {
        candidate = `${base}_${suffix}`;
        suffix += 1;
    }

    return candidate;
}

/** Same idea for a custom field key, unique across every custom field. */
function customFieldKeyFor(
    label: string,
    fields: CustomFieldRecord[],
    seed: number,
): string {
    const base =
        label
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'custom_field';

    let candidate = base;
    let suffix = seed;

    while (fields.some((field) => field.key === candidate)) {
        candidate = `${base}_${suffix}`;
        suffix += 1;
    }

    return candidate;
}

/**
 * How many records in the store still reference one option.
 *
 * Backed by the columns that actually hold the value (§6.1). The two
 * frontend-constant lists are matched against the free text they appear in.
 * Zero means nothing points at the option, which is exactly what the
 * archive confirm says out loud.
 */
function optionUsage(
    state: SystemState,
    list: OptionListKey,
    option: OptionRecord,
): number {
    switch (list) {
        case 'contract_types':
            return state.jobPosts.filter(
                (post) => post.contractType === option.value,
            ).length;
        case 'education_levels':
            return state.jobPosts.filter(
                (post) => post.educationLevel === option.value,
            ).length;
        case 'recruitment_types':
            return state.jobPosts.filter(
                (post) => post.recruitmentType === option.value,
            ).length;
        case 'gender_requirement':
            return state.jobPosts.filter(
                (post) => post.genderRequirement === option.value,
            ).length;
        case 'currencies':
            return state.jobPosts.filter(
                (post) => post.salaryCurrency === option.value,
            ).length;
        case 'languages':
            return state.jobPosts.filter((post) =>
                post.languages.some(
                    (language) => language.language === option.value,
                ),
            ).length;
        case 'language_proficiency':
            return state.jobPosts.filter((post) =>
                post.languages.some(
                    (language) => language.proficiency === option.value,
                ),
            ).length;
        case 'application_stages':
            return state.applications.filter(
                (application) => application.stage === option.value,
            ).length;
        case 'availability':
            return (
                state.applications.filter(
                    (application) => application.availability === option.value,
                ).length +
                state.applicantProfiles.filter(
                    (profile) => profile.availability === option.value,
                ).length
            );
        case 'skill_levels':
            return state.applicantSkills.filter(
                (skill) => skill.skillLevel === option.value,
            ).length;
        case 'document_types':
            return state.applicantDocuments.filter(
                (document) => document.documentType === option.value,
            ).length;
        case 'question_answer_types':
            return state.jobPostQuestions.filter(
                (question) => question.answerType === option.value,
            ).length;
        case 'destination_countries':
            return state.jobPosts.filter((post) =>
                post.workLocation
                    .toLowerCase()
                    .includes(option.label.toLowerCase()),
            ).length;
        case 'country_dial_codes':
            return (
                state.applicantProfiles.filter((profile) =>
                    profile.phoneNumber?.startsWith(option.value),
                ).length +
                state.jobPosts.filter((post) =>
                    post.contactPhone?.startsWith(option.value),
                ).length
            );
    }
}

/** Skeleton rows so a pane paints in the same beat as the tables do. */
function ListSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <ul
            className="flex flex-col gap-1.5"
            data-testid="list-skeleton"
            aria-hidden="true"
        >
            {Array.from({ length: rows }).map((_, index) => (
                <li
                    key={`skeleton-${index}`}
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-3"
                >
                    <Skeleton className="h-4 w-1/2 motion-reduce:animate-none" />
                </li>
            ))}
        </ul>
    );
}

const optionRowClasses =
    'group flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 transition-colors hover:border-[var(--teal)] focus-within:border-[var(--teal)] motion-reduce:transition-none';

/** One editable option: reorder, rename inline, usage pill, archive. */
function OptionRow({
    option,
    index,
    total,
    usage,
    noun,
    editing,
    editName,
    editError,
    onStartEdit,
    onEditChange,
    onCommitEdit,
    onCancelEdit,
    onMove,
    onArchive,
}: {
    option: OptionRecord;
    index: number;
    total: number;
    usage: number;
    noun: string;
    editing: boolean;
    editName: string;
    editError: string | null;
    onStartEdit: () => void;
    onEditChange: (value: string) => void;
    onCommitEdit: () => void;
    onCancelEdit: () => void;
    onMove: (targetIndex: number) => void;
    onArchive: () => void;
}) {
    const [dragOver, setDragOver] = useState(false);

    return (
        <li
            data-testid={`row-option-${option.value}`}
            className={optionRowClasses}
        >
            <ReorderControls
                index={index}
                total={total}
                onMove={onMove}
                onDragStart={() => undefined}
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                }}
                onDrop={() => {
                    setDragOver(false);
                    onMove(index);
                }}
                canDrop={dragOver}
            />

            <RenameableBody
                name={option.label}
                editing={editing}
                editName={editName}
                editError={editError}
                onStartEdit={onStartEdit}
                onEditChange={onEditChange}
                onCommitEdit={onCommitEdit}
                onCancelEdit={onCancelEdit}
            />

            <span
                title={
                    option.inUse
                        ? 'Records already store this key, so only the label can change.'
                        : 'Stored key for this option.'
                }
                className="hidden shrink-0 items-center gap-1 text-[11px] text-[var(--slate)] sm:flex"
            >
                {option.inUse && <Lock className="size-3" aria-hidden="true" />}
                {option.value}
            </span>

            <UsageCount count={usage} noun={noun} />

            <RenameArchiveMenu onRename={onStartEdit} onArchive={onArchive} />
        </li>
    );
}

/**
 * An archived option row: the same furniture as the shared `ArchivedRow`,
 * but with the usage noun of its own list (applications, documents, …)
 * rather than the shared row's fixed "job posts".
 */
function ArchivedOptionRow({
    label,
    usage,
    noun,
    onRestore,
}: {
    label: string;
    usage: number;
    noun: string;
    onRestore: () => void;
}) {
    return (
        <li
            data-testid="archived-option-row"
            className="flex items-center gap-3 rounded-md px-2 py-1.5 opacity-70"
        >
            <Archive
                className="size-4 shrink-0 text-[var(--slate)]"
                aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-sm text-[var(--navy)]">
                {label}
            </span>
            <UsageCount count={usage} noun={noun} />
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRestore}
                data-testid="button-restore-option"
            >
                <ArchiveRestore className="size-4" aria-hidden="true" />
                Restore
            </Button>
        </li>
    );
}

/** Area 1: pick an option list, then edit its options inline. */
function OptionListsPane({
    state,
    loading,
    addSignal,
}: {
    state: SystemState;
    loading: boolean;
    addSignal: number;
}) {
    const [selectedKey, setSelectedKey] =
        useState<OptionListKey>('contract_types');
    const [search, setSearch] = useState('');
    const [adding, setAdding] = useState(false);
    const [draftLabel, setDraftLabel] = useState('');
    const [draftError, setDraftError] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editError, setEditError] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [archiving, setArchiving] = useState<{
        value: string;
        label: string;
        usage: number;
    } | null>(null);

    const draftInputRef = useRef<HTMLInputElement>(null);

    const lists = useMemo(
        () =>
            OPTION_LIST_KEYS.map((key) => ({
                key,
                label: OPTION_LIST_LABELS[key],
                active: state.optionLists[key].filter((option) => option.active)
                    .length,
                archived: state.optionLists[key].filter(
                    (option) => !option.active,
                ).length,
            })),
        [state.optionLists],
    );

    const options = useMemo(
        () =>
            [...state.optionLists[selectedKey]].sort(
                (a, b) => a.sortOrder - b.sortOrder,
            ),
        [state.optionLists, selectedKey],
    );

    const activeOptions = options.filter((option) => option.active);
    const archivedOptions = options.filter((option) => !option.active);
    const usageNoun = OPTION_USAGE_NOUNS[selectedKey];

    const needle = search.trim().toLowerCase();
    const filteredOptions = needle
        ? activeOptions.filter(
              (option) =>
                  option.label.toLowerCase().includes(needle) ||
                  option.value.toLowerCase().includes(needle),
          )
        : activeOptions;

    const usageByValue = useMemo(() => {
        const counts = new Map<string, number>();

        for (const option of options) {
            counts.set(option.value, optionUsage(state, selectedKey, option));
        }

        return counts;
    }, [state, selectedKey, options]);

    const usageOf = (value: string): number => usageByValue.get(value) ?? 0;

    // One honest sentence about the impact of archiving the selected option.
    const archivingUsageLine =
        archiving === null || archiving.usage === 0
            ? 'No records use it yet.'
            : archiving.usage === 1
              ? `1 ${usageNoun} still uses it — it keeps the value it already has.`
              : `${archiving.usage} ${usageNoun}s still use it — they keep the values they already have.`;

    useEffect(() => {
        if (adding) {
            draftInputRef.current?.focus();
        }
    }, [adding]);

    // The header's "Add option" button reaches into this pane.
    useEffect(() => {
        if (addSignal === 0) {
            return;
        }

        setAdding(true);
        setDraftLabel('');
        setDraftError(null);
        setEditingValue(null);
    }, [addSignal]);

    function selectList(key: OptionListKey) {
        setSelectedKey(key);
        setSearch('');
        setShowArchived(false);
        setAdding(false);
        setEditingValue(null);
    }

    function cancelAdd() {
        setAdding(false);
        setDraftLabel('');
        setDraftError(null);
    }

    function startAdd() {
        setAdding(true);
        setDraftLabel('');
        setDraftError(null);
        setEditingValue(null);
    }

    function commitAdd() {
        const label = draftLabel.trim();

        if (label === '') {
            setDraftError('Enter a label.');
            return;
        }

        if (isDuplicateOptionLabel(activeOptions, label, null)) {
            setDraftError(`An option labelled ${label} already exists here.`);
            return;
        }

        const nextId = nextSystemId(state);
        const value = optionValueFor(label, options, nextId);
        const sortOrder =
            activeOptions.reduce(
                (max, option) => Math.max(max, option.sortOrder),
                -1,
            ) + 1;

        commitSystemChange({
            action: 'create',
            subjectType: 'option',
            subjectId: nextId,
            subjectLabel: label,
            changes: [{ field: 'Option label', from: null, to: label }],
            apply: (current) => {
                const optionLists = { ...current.optionLists };

                optionLists[selectedKey] = [
                    ...optionLists[selectedKey],
                    { value, label, active: true, sortOrder, inUse: false },
                ];

                return {
                    ...current,
                    nextId: current.nextId + 1,
                    optionLists,
                };
            },
        });

        toast.success(
            `“${label}” added to ${OPTION_LIST_LABELS[selectedKey]}.`,
            {
                duration: 6000,
                action: {
                    label: 'Undo',
                    onClick: () => archiveOption(value, label, 0),
                },
            },
        );
        cancelAdd();
    }

    function startEdit(value: string, label: string) {
        setEditingValue(value);
        setEditLabel(label);
        setEditError(null);
        setAdding(false);
    }

    function cancelEdit() {
        setEditingValue(null);
        setEditLabel('');
        setEditError(null);
    }

    function renameOption(value: string, from: string, to: string) {
        commitSystemChange({
            action: 'rename',
            subjectType: 'option',
            subjectId: value,
            subjectLabel: to,
            changes: [{ field: 'Option label', from, to }],
            apply: (current) => {
                const optionLists = { ...current.optionLists };

                optionLists[selectedKey] = optionLists[selectedKey].map(
                    (option) =>
                        option.value === value
                            ? { ...option, label: to }
                            : option,
                );

                return { ...current, optionLists };
            },
        });
    }

    function commitEdit(value: string, originalLabel: string) {
        const label = editLabel.trim();

        if (label === '') {
            setEditError('Enter a label.');
            return;
        }

        if (isDuplicateOptionLabel(activeOptions, label, value)) {
            setEditError(`An option labelled ${label} already exists here.`);
            return;
        }

        if (label === originalLabel) {
            cancelEdit();
            return;
        }

        renameOption(value, originalLabel, label);

        toast.success('Option label updated.', {
            duration: 6000,
            action: {
                label: 'Undo',
                onClick: () => renameOption(value, label, originalLabel),
            },
        });
        cancelEdit();
    }

    /**
     * Writes fresh `sortOrder` values for the visible slice. The move
     * buttons and a drop both resolve to a target index, so they share
     * this one code path.
     */
    function reorderOptions(
        ordered: OptionRecord[],
        fromValue: string,
        targetIndex: number,
    ) {
        const fromIndex = ordered.findIndex(
            (option) => option.value === fromValue,
        );

        if (fromIndex === -1 || targetIndex === fromIndex) {
            return;
        }

        const next = [...ordered];
        const [moved] = next.splice(fromIndex, 1);

        if (!moved) {
            return;
        }

        next.splice(targetIndex, 0, moved);

        const order = new Map(
            next.map((option, index) => [option.value, index]),
        );

        commitSystemChange({
            action: 'reorder',
            subjectType: 'option',
            subjectId: fromValue,
            subjectLabel: `${moved.label} → position ${targetIndex + 1}`,
            changes: [
                {
                    field: 'Sort order',
                    from: fromIndex + 1,
                    to: targetIndex + 1,
                },
            ],
            apply: (current) => {
                const optionLists = { ...current.optionLists };

                optionLists[selectedKey] = optionLists[selectedKey].map(
                    (option) =>
                        order.has(option.value)
                            ? {
                                  ...option,
                                  sortOrder:
                                      order.get(option.value) ??
                                      option.sortOrder,
                              }
                            : option,
                );

                return { ...current, optionLists };
            },
        });

        toast.success(
            `“${moved.label}” moved to position ${targetIndex + 1}.`,
            {
                duration: 6000,
                action: {
                    label: 'Undo',
                    onClick: () => reorderOptions(next, fromValue, fromIndex),
                },
            },
        );
    }

    function archiveOption(value: string, label: string, usage: number) {
        commitSystemChange({
            action: 'archive',
            subjectType: 'option',
            subjectId: value,
            subjectLabel: label,
            changes: [
                { field: 'Active', from: true, to: false },
                { field: 'Records using it', from: usage, to: usage },
            ],
            apply: (current) => {
                const optionLists = { ...current.optionLists };

                optionLists[selectedKey] = optionLists[selectedKey].map(
                    (option) =>
                        option.value === value
                            ? { ...option, active: false }
                            : option,
                );

                return { ...current, optionLists };
            },
        });

        toast.success(`“${label}” archived.`, {
            duration: 6000,
            action: {
                label: 'Undo',
                onClick: () => restoreOption(value, label, usage),
            },
        });
    }

    function restoreOption(value: string, label: string, usage: number) {
        commitSystemChange({
            action: 'restore',
            subjectType: 'option',
            subjectId: value,
            subjectLabel: label,
            changes: [{ field: 'Active', from: false, to: true }],
            apply: (current) => {
                const optionLists = { ...current.optionLists };

                optionLists[selectedKey] = optionLists[selectedKey].map(
                    (option) =>
                        option.value === value
                            ? { ...option, active: true }
                            : option,
                );

                return { ...current, optionLists };
            },
        });

        toast.success(`“${label}” restored.`, {
            duration: 6000,
            action: {
                label: 'Undo',
                onClick: () => archiveOption(value, label, usage),
            },
        });
    }

    return (
        <>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)]">
                {/* ---------- Left pane: the lists ---------- */}
                <section
                    className="flex flex-col gap-3"
                    data-testid="pane-option-lists"
                >
                    <header className="min-w-0">
                        <h2 className="font-serif text-lg font-bold tracking-[-0.02em] text-[var(--navy)]">
                            Option lists
                        </h2>
                        <p className="text-xs text-[var(--slate)]">
                            The vocabulary behind every dropdown on the
                            platform. Pick a list to edit its options.
                        </p>
                    </header>

                    {loading ? (
                        <ListSkeleton rows={6} />
                    ) : (
                        <ul className="flex flex-col gap-1.5">
                            {lists.map((list) => (
                                <li key={list.key}>
                                    <button
                                        type="button"
                                        onClick={() => selectList(list.key)}
                                        aria-pressed={selectedKey === list.key}
                                        data-testid={`button-option-list-${list.key}`}
                                        className={cn(
                                            'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none motion-reduce:transition-none',
                                            selectedKey === list.key
                                                ? 'border-[var(--teal)] bg-[var(--teal-light)]/40 text-[var(--navy)]'
                                                : 'border-[var(--line)] bg-white text-[var(--slate)] hover:border-[var(--teal)] hover:text-[var(--navy)]',
                                        )}
                                    >
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                            {list.label}
                                        </span>
                                        <span className="shrink-0 text-xs text-[var(--slate)] tabular-nums">
                                            {list.active}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* ---------- Right pane: the options ---------- */}
                <section
                    className="flex flex-col gap-3"
                    data-testid="pane-options"
                >
                    <header className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="font-serif text-lg font-bold tracking-[-0.02em] text-[var(--navy)]">
                                {OPTION_LIST_LABELS[selectedKey]}
                            </h2>
                            <p className="text-xs text-[var(--slate)]">
                                {activeOptions.length} active ·{' '}
                                {archivedOptions.length} archived
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <SearchBox
                                value={search}
                                onChange={setSearch}
                                label="Search options"
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={startAdd}
                                data-testid="button-option-add"
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Add
                            </Button>
                        </div>
                    </header>

                    {adding && (
                        <InlineAddRow
                            ref={draftInputRef}
                            label="Option label"
                            value={draftLabel}
                            error={draftError}
                            onChange={setDraftLabel}
                            onSave={commitAdd}
                            onCancel={cancelAdd}
                        />
                    )}

                    {loading ? (
                        <ListSkeleton rows={5} />
                    ) : (
                        <>
                            <ul className="flex flex-col gap-1.5">
                                {filteredOptions.map((option, index) => (
                                    <OptionRow
                                        key={option.value}
                                        option={option}
                                        index={index}
                                        total={filteredOptions.length}
                                        usage={usageOf(option.value)}
                                        noun={usageNoun}
                                        editing={editingValue === option.value}
                                        editName={editLabel}
                                        editError={editError}
                                        onStartEdit={() =>
                                            startEdit(
                                                option.value,
                                                option.label,
                                            )
                                        }
                                        onEditChange={setEditLabel}
                                        onCommitEdit={() =>
                                            commitEdit(
                                                option.value,
                                                option.label,
                                            )
                                        }
                                        onCancelEdit={cancelEdit}
                                        onMove={(targetIndex) =>
                                            reorderOptions(
                                                filteredOptions,
                                                option.value,
                                                targetIndex,
                                            )
                                        }
                                        onArchive={() =>
                                            setArchiving({
                                                value: option.value,
                                                label: option.label,
                                                usage: usageOf(option.value),
                                            })
                                        }
                                    />
                                ))}
                            </ul>

                            {filteredOptions.length === 0 && (
                                <DashboardEmptyState
                                    icon={needle ? SearchX : ListChecks}
                                    title={
                                        needle
                                            ? 'No matching options'
                                            : 'No options yet'
                                    }
                                    message={
                                        needle
                                            ? 'Clear the search to see every option in this list.'
                                            : 'Add the first option applicants and agencies will pick from.'
                                    }
                                    onReset={
                                        needle ? () => setSearch('') : undefined
                                    }
                                />
                            )}

                            {archivedOptions.length > 0 && needle === '' && (
                                <ArchivedSection
                                    count={archivedOptions.length}
                                    open={showArchived}
                                    onToggle={() =>
                                        setShowArchived((current) => !current)
                                    }
                                >
                                    <ul className="flex flex-col gap-1.5">
                                        {archivedOptions.map((option) => (
                                            <ArchivedOptionRow
                                                key={option.value}
                                                label={option.label}
                                                usage={usageOf(option.value)}
                                                noun={usageNoun}
                                                onRestore={() =>
                                                    restoreOption(
                                                        option.value,
                                                        option.label,
                                                        usageOf(option.value),
                                                    )
                                                }
                                            />
                                        ))}
                                    </ul>
                                </ArchivedSection>
                            )}
                        </>
                    )}
                </section>
            </div>

            <ConfirmDialog
                open={archiving !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setArchiving(null);
                    }
                }}
                title="Archive this option?"
                description={`“${archiving?.label ?? ''}” stops appearing in pickers straight away.`}
                consequences={[
                    archivingUsageLine,
                    `It stops appearing in ${OPTION_LIST_LABELS[selectedKey].toLowerCase()} pickers.`,
                    'You can restore it at any time.',
                ]}
                confirmLabel="Archive"
                destructive
                data-testid="confirm-option-archive"
                onConfirm={() => {
                    if (archiving) {
                        archiveOption(
                            archiving.value,
                            archiving.label,
                            archiving.usage,
                        );
                        setArchiving(null);
                    }
                }}
            />
        </>
    );
}

type FormFieldDraft = {
    label: string;
    helpText: string;
    placeholder: string;
    section: string;
    required: boolean;
    visible: boolean;
};

/**
 * Right-hand sheet for one system form field. Presentation only — the
 * column key and the type stay locked, each with the reason and the way
 * out ("add a custom field").
 */
function FormFieldSheet({
    field,
    onClose,
    onAddCustomField,
}: {
    field: FormFieldRecord;
    onClose: () => void;
    onAddCustomField: () => void;
}) {
    const { values, changedFields, isDirty, isFieldDirty, setValue, discard } =
        useFormChanges<FormFieldDraft>({
            label: field.label,
            helpText: field.helpText,
            placeholder: field.placeholder,
            section: field.section,
            required: field.required,
            visible: field.visible,
        });

    const [confirmingDiscard, setConfirmingDiscard] = useState(false);

    const labelMissing = values.label.trim() === '';
    const showsPlaceholder = PLACEHOLDER_TYPES.has(field.type);

    function requestClose() {
        if (isDirty) {
            setConfirmingDiscard(true);
            return;
        }

        onClose();
    }

    function save() {
        if (labelMissing) {
            return;
        }

        const label = values.label.trim();
        const changes: AuditChange[] = [];

        if (label !== field.label) {
            changes.push({ field: 'Label', from: field.label, to: label });
        }
        if (values.helpText !== field.helpText) {
            changes.push({
                field: 'Help text',
                from: field.helpText,
                to: values.helpText,
            });
        }
        if (values.placeholder !== field.placeholder) {
            changes.push({
                field: 'Placeholder',
                from: field.placeholder,
                to: values.placeholder,
            });
        }
        if (values.section !== field.section) {
            changes.push({
                field: 'Section',
                from: field.section,
                to: values.section,
            });
        }
        if (values.required !== field.required) {
            changes.push({
                field: 'Required',
                from: field.required,
                to: values.required,
            });
        }
        if (values.visible !== field.visible) {
            changes.push({
                field: 'Shown on the form',
                from: field.visible,
                to: values.visible,
            });
        }

        if (changes.length === 0) {
            onClose();
            return;
        }

        commitSystemChange({
            action: 'update',
            subjectType: 'form_field',
            subjectId: field.id,
            subjectLabel: label,
            changes,
            apply: (current) => ({
                ...current,
                formFields: current.formFields.map((entry) =>
                    entry.id === field.id
                        ? {
                              ...entry,
                              label,
                              helpText: values.helpText,
                              placeholder: values.placeholder,
                              section: values.section,
                              required: values.required,
                              visible: values.visible,
                          }
                        : entry,
                ),
            }),
        });

        toast.success(`“${label}” updated.`, {
            duration: 6000,
            action: {
                label: 'Undo',
                onClick: () =>
                    commitSystemChange({
                        action: 'update',
                        subjectType: 'form_field',
                        subjectId: field.id,
                        subjectLabel: field.label,
                        changes: changes.map((change) => ({
                            field: change.field,
                            from: change.to,
                            to: change.from,
                        })),
                        apply: (current) => ({
                            ...current,
                            formFields: current.formFields.map((entry) =>
                                entry.id === field.id
                                    ? {
                                          ...entry,
                                          label: field.label,
                                          helpText: field.helpText,
                                          placeholder: field.placeholder,
                                          section: field.section,
                                          required: field.required,
                                          visible: field.visible,
                                      }
                                    : entry,
                            ),
                        }),
                    }),
            },
        });

        onClose();
    }

    return (
        <>
            <EntitySheet
                open
                onOpenChange={(open) => {
                    if (!open) {
                        requestClose();
                    }
                }}
                title={`Edit ${field.label}`}
                description="Presentation only: how the field reads, where it sits, and whether it is required."
                size="wide"
                data-testid="sheet-form-field"
                footer={
                    <SheetSaveActions
                        onCancel={requestClose}
                        onSave={save}
                        saveDisabled={labelMissing}
                        data-testid="sheet-save-form-field"
                    />
                }
            >
                <div className="flex flex-col gap-2">
                    <Label htmlFor="form-field-label">Label</Label>
                    <Input
                        id="form-field-label"
                        value={values.label}
                        onChange={(event) =>
                            setValue('label', event.target.value)
                        }
                        aria-invalid={labelMissing}
                        className={
                            isFieldDirty('label')
                                ? 'border-[var(--teal)]'
                                : undefined
                        }
                        data-testid="input-label"
                    />
                    {labelMissing && (
                        <p
                            role="alert"
                            className="text-xs font-medium text-[var(--danger)]"
                        >
                            Every field needs a label.
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="form-field-help">Help text</Label>
                    <Textarea
                        id="form-field-help"
                        rows={3}
                        value={values.helpText}
                        onChange={(event) =>
                            setValue('helpText', event.target.value)
                        }
                        className={
                            isFieldDirty('helpText')
                                ? 'border-[var(--teal)]'
                                : undefined
                        }
                        data-testid="input-help-text"
                    />
                    <p className="text-xs text-[var(--slate)]">
                        Shown under the field to explain what to enter.
                    </p>
                </div>

                {showsPlaceholder && (
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="form-field-placeholder">
                            Placeholder
                        </Label>
                        <Input
                            id="form-field-placeholder"
                            value={values.placeholder}
                            onChange={(event) =>
                                setValue('placeholder', event.target.value)
                            }
                            className={
                                isFieldDirty('placeholder')
                                    ? 'border-[var(--teal)]'
                                    : undefined
                            }
                            data-testid="input-placeholder"
                        />
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <Label htmlFor="form-field-section">Section</Label>
                    <Input
                        id="form-field-section"
                        value={values.section}
                        onChange={(event) =>
                            setValue('section', event.target.value)
                        }
                        className={
                            isFieldDirty('section')
                                ? 'border-[var(--teal)]'
                                : undefined
                        }
                        data-testid="input-section"
                    />
                    <p className="text-xs text-[var(--slate)]">
                        Groups the field under a heading on its form.
                    </p>
                </div>

                <div className="flex flex-wrap gap-x-8 gap-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--navy)]">
                        <Checkbox
                            checked={values.required}
                            onCheckedChange={(checked) =>
                                setValue('required', checked === true)
                            }
                            data-testid="checkbox-required"
                        />
                        Required
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--navy)]">
                        <Checkbox
                            checked={values.visible}
                            onCheckedChange={(checked) =>
                                setValue('visible', checked === true)
                            }
                            data-testid="checkbox-visible"
                        />
                        Visible on the form
                    </label>
                </div>

                <LockedField
                    label="Field key"
                    value={<span className="font-semibold">{field.key}</span>}
                    reason="The key is fixed because data is already stored under it — change the label instead, or add a custom field for anything genuinely new."
                    data-testid="locked-form-field-key"
                />

                <LockedField
                    label="Field type"
                    value={fieldTypeLabel(field.type)}
                    reason="The type decides which control the form renders, so system fields keep it. Custom fields pick their own type when you add them."
                    data-testid="locked-form-field-type"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                    <p className="text-xs text-[var(--slate)]">
                        {isDirty
                            ? `${changedFields.length} unsaved ${changedFields.length === 1 ? 'change' : 'changes'}`
                            : 'Nothing to save yet.'}
                    </p>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                            onClose();
                            onAddCustomField();
                        }}
                        data-testid="button-form-field-add-custom"
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        Add a custom field
                    </Button>
                </div>
            </EntitySheet>

            <ConfirmDialog
                open={confirmingDiscard}
                onOpenChange={setConfirmingDiscard}
                title="Discard unsaved changes?"
                description={`Your edits to “${field.label}” have not been saved.`}
                confirmLabel="Discard changes"
                cancelLabel="Keep editing"
                data-testid="confirm-discard-changes"
                onConfirm={() => {
                    setConfirmingDiscard(false);
                    discard();
                    onClose();
                }}
            />
        </>
    );
}

/** Area 2: the seeded fields on the four forms, edited in a sheet. */
function FormFieldsPane({
    state,
    loading,
    onAddCustomField,
}: {
    state: SystemState;
    loading: boolean;
    onAddCustomField: () => void;
}) {
    const [ownerFilter, setOwnerFilter] = useState<FieldOwnerFilter>('all');
    const [q, setQ] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase();

        return state.formFields
            .filter(
                (field) => ownerFilter === 'all' || field.owner === ownerFilter,
            )
            .filter(
                (field) =>
                    needle === '' ||
                    [field.label, field.key, field.section].some((value) =>
                        value.toLowerCase().includes(needle),
                    ),
            )
            .sort(
                (a, b) =>
                    a.owner.localeCompare(b.owner) || a.sortOrder - b.sortOrder,
            );
    }, [state.formFields, ownerFilter, q]);

    const isFiltered = ownerFilter !== 'all' || q.trim() !== '';
    const editingField =
        state.formFields.find((field) => field.id === editingId) ?? null;

    function resetFilters() {
        setOwnerFilter('all');
        setQ('');
    }

    const columns: Column<FormFieldRecord>[] = [
        {
            key: 'field',
            header: 'Field',
            cell: (field) => (
                <div className="min-w-0">
                    <span className="block truncate font-medium text-[var(--navy)]">
                        {field.label}
                    </span>
                    <span className="block truncate text-xs text-[var(--slate)]">
                        {field.key}
                    </span>
                </div>
            ),
        },
        {
            key: 'form',
            header: 'Form',
            width: '150px',
            cell: (field) => (
                <span className="text-sm text-[var(--navy)]">
                    {OWNER_LABELS[field.owner]}
                </span>
            ),
        },
        {
            key: 'section',
            header: 'Section',
            width: '130px',
            cell: (field) => (
                <span className="text-xs font-medium text-[var(--slate)]">
                    {field.section}
                </span>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            width: '130px',
            cell: (field) => (
                <StatusPill tone="info" size="sm">
                    {fieldTypeLabel(field.type)}
                </StatusPill>
            ),
        },
        {
            key: 'required',
            header: 'Required',
            width: '110px',
            cell: (field) =>
                field.required ? (
                    <StatusPill tone="teal" size="sm">
                        Required
                    </StatusPill>
                ) : (
                    <span className="text-xs text-[var(--slate)]">
                        Optional
                    </span>
                ),
        },
        {
            key: 'visible',
            header: 'Shown',
            width: '100px',
            cell: (field) =>
                field.visible ? (
                    <StatusPill tone="success" size="sm">
                        Visible
                    </StatusPill>
                ) : (
                    <StatusPill tone="neutral" size="sm">
                        Hidden
                    </StatusPill>
                ),
        },
    ];

    return (
        <>
            <DataTable<FormFieldRecord>
                columns={columns}
                data={rows}
                loading={loading}
                getRowId={(field) => field.id}
                getRowTestId={(field) => `row-form-field-${field.id}`}
                renderRowActions={(field) => (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(field.id)}
                        data-testid="button-edit-form-field"
                    >
                        <Pencil className="size-4" aria-hidden="true" />
                        Edit
                    </Button>
                )}
                toolbar={
                    <DataTableToolbar data-testid="form-fields-toolbar">
                        <DataTableField
                            label="Search"
                            htmlFor="filter-form-field-search"
                            className="basis-full sm:min-w-64 sm:flex-1 sm:basis-auto"
                        >
                            <DataTableSearch
                                id="filter-form-field-search"
                                value={q}
                                onChange={setQ}
                                placeholder="Search fields by label, key or section..."
                                className="w-full"
                                data-testid="input-search-form-fields"
                            />
                        </DataTableField>
                        <DataTableField
                            label="Form"
                            htmlFor="filter-form-field-owner"
                        >
                            <DataTableSelect<FieldOwnerFilter>
                                id="filter-form-field-owner"
                                value={ownerFilter}
                                onValueChange={setOwnerFilter}
                                options={OWNER_FILTER_OPTIONS}
                                ariaLabel="Filter by form"
                                data-testid="select-form-field-owner"
                            />
                        </DataTableField>
                        <DataTableRefreshButton
                            onClick={resetFilters}
                            spinning={loading}
                            data-testid="button-refresh-form-fields"
                        />
                    </DataTableToolbar>
                }
                emptyState={
                    <DashboardEmptyState
                        icon={isFiltered ? SearchX : Inbox}
                        title={
                            isFiltered
                                ? 'No form fields match your filters'
                                : 'No form fields yet'
                        }
                        message={
                            isFiltered
                                ? 'Clear the search or pick every form to see the seeded fields.'
                                : 'Seeded fields appear here once the forms are configured.'
                        }
                        onReset={isFiltered ? resetFilters : undefined}
                    />
                }
                data-testid="table-form-fields"
            />

            {editingField && (
                <FormFieldSheet
                    key={editingField.id}
                    field={editingField}
                    onClose={() => setEditingId(null)}
                    onAddCustomField={onAddCustomField}
                />
            )}
        </>
    );
}

type CustomFieldDraft = {
    label: string;
    owner: FormFieldOwner;
    type: CustomFieldRecord['type'];
    section: string;
    helpText: string;
    optionsText: string;
    required: boolean;
    visible: boolean;
};

/**
 * Right-hand sheet to add or edit one custom field. The key is generated
 * from the label on save and locked afterwards, so answers already stored
 * under it keep resolving.
 */
function CustomFieldSheet({
    state,
    field,
    onClose,
    onArchive,
}: {
    state: SystemState;
    field: CustomFieldRecord | null;
    onClose: () => void;
    onArchive: (fields: CustomFieldRecord[]) => void;
}) {
    const { values, changedFields, isDirty, isFieldDirty, setValue, discard } =
        useFormChanges<CustomFieldDraft>({
            label: field?.label ?? '',
            owner: field?.owner ?? 'job_post',
            type: field?.type ?? 'short_text',
            section: field?.section ?? 'Additional',
            helpText: field?.helpText ?? '',
            optionsText: field?.options.join('\n') ?? '',
            required: field?.required ?? false,
            visible: field?.visible ?? true,
        });

    const [confirmingDiscard, setConfirmingDiscard] = useState(false);
    const [labelError, setLabelError] = useState<string | null>(null);
    const [optionsError, setOptionsError] = useState<string | null>(null);

    const needsOptions =
        values.type === 'single_select' || values.type === 'multi_select';
    const labelMissing = values.label.trim() === '';

    function requestClose() {
        if (isDirty) {
            setConfirmingDiscard(true);
            return;
        }

        onClose();
    }

    function save() {
        const label = values.label.trim();

        if (label === '') {
            setLabelError('Enter a label.');
            return;
        }

        const section = values.section.trim() || 'Additional';
        const options = needsOptions
            ? values.optionsText
                  .split('\n')
                  .map((line) => line.trim())
                  .filter((line) => line !== '')
            : [];

        if (needsOptions && options.length === 0) {
            setOptionsError('Add at least one option, one per line.');
            return;
        }

        if (field === null) {
            const nextId = nextSystemId(state);
            const record: CustomFieldRecord = {
                id: `custom-${nextId}`,
                owner: values.owner,
                label,
                key: customFieldKeyFor(label, state.customFields, nextId),
                type: values.type,
                options,
                required: values.required,
                visible: values.visible,
                helpText: values.helpText.trim(),
                section,
                sortOrder: state.customFields.filter(
                    (entry) => entry.owner === values.owner,
                ).length,
            };

            commitSystemChange({
                action: 'create',
                subjectType: 'custom_field',
                subjectId: record.id,
                subjectLabel: label,
                changes: [{ field: 'Custom field', from: null, to: label }],
                apply: (current) => ({
                    ...current,
                    nextId: current.nextId + 1,
                    customFields: [...current.customFields, record],
                }),
            });

            toast.success(
                `“${label}” added to the ${OWNER_LABELS[record.owner].toLowerCase()} form.`,
                {
                    duration: 6000,
                    action: {
                        label: 'Undo',
                        onClick: () => onArchive([record]),
                    },
                },
            );
            onClose();
            return;
        }

        const previous = field;
        const changes: AuditChange[] = [];

        if (label !== previous.label) {
            changes.push({
                field: 'Label',
                from: previous.label,
                to: label,
            });
        }
        if (values.owner !== previous.owner) {
            changes.push({
                field: 'Form',
                from: OWNER_LABELS[previous.owner],
                to: OWNER_LABELS[values.owner],
            });
        }
        if (values.type !== previous.type) {
            changes.push({
                field: 'Type',
                from: CUSTOM_FIELD_TYPE_LABELS[previous.type],
                to: CUSTOM_FIELD_TYPE_LABELS[values.type],
            });
        }
        if (section !== previous.section) {
            changes.push({
                field: 'Section',
                from: previous.section,
                to: section,
            });
        }
        if (values.helpText !== previous.helpText) {
            changes.push({
                field: 'Help text',
                from: previous.helpText,
                to: values.helpText,
            });
        }
        if (options.join(' · ') !== previous.options.join(' · ')) {
            changes.push({
                field: 'Options',
                from: previous.options.join(', '),
                to: options.join(', '),
            });
        }
        if (values.required !== previous.required) {
            changes.push({
                field: 'Required',
                from: previous.required,
                to: values.required,
            });
        }
        if (values.visible !== previous.visible) {
            changes.push({
                field: 'Shown on the form',
                from: previous.visible,
                to: values.visible,
            });
        }

        if (changes.length === 0) {
            onClose();
            return;
        }

        commitSystemChange({
            action: 'update',
            subjectType: 'custom_field',
            subjectId: previous.id,
            subjectLabel: label,
            changes,
            apply: (current) => ({
                ...current,
                customFields: current.customFields.map((entry) =>
                    entry.id === previous.id
                        ? {
                              ...entry,
                              label,
                              owner: values.owner,
                              type: values.type,
                              section,
                              helpText: values.helpText,
                              options,
                              required: values.required,
                              visible: values.visible,
                          }
                        : entry,
                ),
            }),
        });

        toast.success(`“${label}” updated.`, {
            duration: 6000,
            action: {
                label: 'Undo',
                onClick: () =>
                    commitSystemChange({
                        action: 'update',
                        subjectType: 'custom_field',
                        subjectId: previous.id,
                        subjectLabel: previous.label,
                        changes: changes.map((change) => ({
                            field: change.field,
                            from: change.to,
                            to: change.from,
                        })),
                        apply: (current) => ({
                            ...current,
                            customFields: current.customFields.map((entry) =>
                                entry.id === previous.id
                                    ? { ...previous }
                                    : entry,
                            ),
                        }),
                    }),
            },
        });

        onClose();
    }

    return (
        <>
            <EntitySheet
                open
                onOpenChange={(open) => {
                    if (!open) {
                        requestClose();
                    }
                }}
                title={
                    field !== null ? `Edit ${field.label}` : 'Add custom field'
                }
                description="Custom fields extend a form without a code change. The key is generated from the label and locked afterwards."
                size="wide"
                data-testid="sheet-custom-field"
                footer={
                    <SheetSaveActions
                        onCancel={requestClose}
                        onSave={save}
                        saveDisabled={labelMissing}
                        data-testid="sheet-save-custom-field"
                    />
                }
            >
                <div className="flex flex-col gap-2">
                    <Label htmlFor="custom-field-label">Label</Label>
                    <Input
                        id="custom-field-label"
                        value={values.label}
                        onChange={(event) => {
                            setLabelError(null);
                            setValue('label', event.target.value);
                        }}
                        aria-invalid={labelError !== null}
                        className={
                            isFieldDirty('label')
                                ? 'border-[var(--teal)]'
                                : undefined
                        }
                        data-testid="input-label"
                    />
                    {labelError && (
                        <p
                            role="alert"
                            className="text-xs font-medium text-[var(--danger)]"
                        >
                            {labelError}
                        </p>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="custom-field-owner">Form</Label>
                        <Select
                            value={values.owner}
                            onValueChange={(value) => {
                                if (isOwner(value)) {
                                    setValue('owner', value);
                                }
                            }}
                        >
                            <SelectTrigger
                                id="custom-field-owner"
                                className="w-full bg-white"
                                data-testid="select-owner"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {OWNER_FILTER_OPTIONS.filter(
                                    (option) => option.value !== 'all',
                                ).map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="custom-field-type">Type</Label>
                        <Select
                            value={values.type}
                            onValueChange={(value) => {
                                setOptionsError(null);
                                if (isCustomFieldType(value)) {
                                    setValue('type', value);
                                }
                            }}
                        >
                            <SelectTrigger
                                id="custom-field-type"
                                className="w-full bg-white"
                                data-testid="select-type"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CUSTOM_FIELD_TYPE_OPTIONS.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {needsOptions && (
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="custom-field-options">Options</Label>
                        <Textarea
                            id="custom-field-options"
                            rows={4}
                            value={values.optionsText}
                            onChange={(event) => {
                                setOptionsError(null);
                                setValue('optionsText', event.target.value);
                            }}
                            aria-invalid={optionsError !== null}
                            data-testid="input-options"
                        />
                        <p className="text-xs text-[var(--slate)]">
                            One option per line — this is the vocabulary the
                            field offers.
                        </p>
                        {optionsError && (
                            <p
                                role="alert"
                                className="text-xs font-medium text-[var(--danger)]"
                            >
                                {optionsError}
                            </p>
                        )}
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <Label htmlFor="custom-field-section">Section</Label>
                    <Input
                        id="custom-field-section"
                        value={values.section}
                        onChange={(event) =>
                            setValue('section', event.target.value)
                        }
                        className={
                            isFieldDirty('section')
                                ? 'border-[var(--teal)]'
                                : undefined
                        }
                        data-testid="input-section"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="custom-field-help">Help text</Label>
                    <Textarea
                        id="custom-field-help"
                        rows={3}
                        value={values.helpText}
                        onChange={(event) =>
                            setValue('helpText', event.target.value)
                        }
                        className={
                            isFieldDirty('helpText')
                                ? 'border-[var(--teal)]'
                                : undefined
                        }
                        data-testid="input-help-text"
                    />
                </div>

                <div className="flex flex-wrap gap-x-8 gap-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--navy)]">
                        <Checkbox
                            checked={values.required}
                            onCheckedChange={(checked) =>
                                setValue('required', checked === true)
                            }
                            data-testid="checkbox-required"
                        />
                        Required
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--navy)]">
                        <Checkbox
                            checked={values.visible}
                            onCheckedChange={(checked) =>
                                setValue('visible', checked === true)
                            }
                            data-testid="checkbox-visible"
                        />
                        Visible on the form
                    </label>
                </div>

                <LockedField
                    label="Field key"
                    value={
                        <span className="font-semibold">
                            {field === null
                                ? customFieldKeyFor(
                                      values.label,
                                      state.customFields,
                                      state.nextId,
                                  )
                                : field.key}
                        </span>
                    }
                    reason={
                        field === null
                            ? 'Generated from the label when you save, then locked so stored answers keep their key.'
                            : `The key is locked once the field is saved — answers already collected under ${field.key} keep resolving. Change the label instead, or add a new custom field.`
                    }
                    data-testid="locked-custom-field-key"
                />

                <p className="text-xs text-[var(--slate)]">
                    {isDirty
                        ? `${changedFields.length} unsaved ${changedFields.length === 1 ? 'change' : 'changes'}`
                        : 'Nothing to save yet.'}
                </p>
            </EntitySheet>

            <ConfirmDialog
                open={confirmingDiscard}
                onOpenChange={setConfirmingDiscard}
                title="Discard unsaved changes?"
                description={`Your edits to ${field !== null ? `“${field.label}”` : 'this new field'} have not been saved.`}
                confirmLabel="Discard changes"
                cancelLabel="Keep editing"
                data-testid="confirm-discard-changes"
                onConfirm={() => {
                    setConfirmingDiscard(false);
                    discard();
                    onClose();
                }}
            />
        </>
    );
}

type CustomFieldPending =
    | { kind: 'archive'; field: CustomFieldRecord }
    | { kind: 'bulk-archive'; fields: CustomFieldRecord[] };

/** Area 3: superadmin-defined fields, sheet editing, bulk archive. */
function CustomFieldsPane({
    state,
    loading,
    addSignal,
}: {
    state: SystemState;
    loading: boolean;
    addSignal: number;
}) {
    const selection = useRowSelection();

    const [ownerFilter, setOwnerFilter] = useState<FieldOwnerFilter>('all');
    const [q, setQ] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [sheet, setSheet] = useState<
        { mode: 'add' } | { mode: 'edit'; field: CustomFieldRecord } | null
    >(null);
    const [pending, setPending] = useState<CustomFieldPending | null>(null);

    // The header's "Add custom field" button reaches into this pane.
    useEffect(() => {
        if (addSignal === 0) {
            return;
        }

        setSheet({ mode: 'add' });
    }, [addSignal]);

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase();

        return state.customFields
            .filter((field) => field.visible)
            .filter(
                (field) => ownerFilter === 'all' || field.owner === ownerFilter,
            )
            .filter(
                (field) =>
                    needle === '' ||
                    [field.label, field.key, field.section].some((value) =>
                        value.toLowerCase().includes(needle),
                    ),
            )
            .sort(
                (a, b) =>
                    a.owner.localeCompare(b.owner) || a.sortOrder - b.sortOrder,
            );
    }, [state.customFields, ownerFilter, q]);

    const archivedRows = useMemo(
        () =>
            state.customFields
                .filter((field) => !field.visible)
                .sort(
                    (a, b) =>
                        a.owner.localeCompare(b.owner) ||
                        a.sortOrder - b.sortOrder,
                ),
        [state.customFields],
    );

    const isFiltered = ownerFilter !== 'all' || q.trim() !== '';

    // How many different forms a pending bulk archive would touch.
    const bulkFormCount = new Set(
        pending?.kind === 'bulk-archive'
            ? pending.fields.map((field) => field.owner)
            : [],
    ).size;

    function resetFilters() {
        setOwnerFilter('all');
        setQ('');
    }

    /** One commit flips the flag for any number of custom fields. */
    function archiveCustomFields(fields: CustomFieldRecord[]) {
        const ids = fields.map((field) => field.id);
        const subjectLabel =
            fields.length === 1 && fields[0]
                ? `“${fields[0].label}”`
                : `${fields.length} custom fields`;

        commitSystemChange({
            action: 'archive',
            subjectType: 'custom_field',
            subjectId: ids.join(','),
            subjectLabel,
            changes: [{ field: 'Shown on the form', from: true, to: false }],
            apply: (current) => ({
                ...current,
                customFields: current.customFields.map((field) =>
                    ids.includes(field.id) && field.visible
                        ? { ...field, visible: false }
                        : field,
                ),
            }),
        });

        toast.success(`${subjectLabel} archived.`, {
            duration: 6000,
            action: {
                label: 'Undo',
                onClick: () => restoreCustomFields(fields),
            },
        });
    }

    function restoreCustomFields(fields: CustomFieldRecord[]) {
        const ids = fields.map((field) => field.id);
        const subjectLabel =
            fields.length === 1 && fields[0]
                ? `“${fields[0].label}”`
                : `${fields.length} custom fields`;

        commitSystemChange({
            action: 'restore',
            subjectType: 'custom_field',
            subjectId: ids.join(','),
            subjectLabel,
            changes: [{ field: 'Shown on the form', from: false, to: true }],
            apply: (current) => ({
                ...current,
                customFields: current.customFields.map((field) =>
                    ids.includes(field.id) && !field.visible
                        ? { ...field, visible: true }
                        : field,
                ),
            }),
        });

        toast.success(`${subjectLabel} restored.`, {
            duration: 6000,
            action: {
                label: 'Undo',
                onClick: () => archiveCustomFields(fields),
            },
        });
    }

    function confirmPending() {
        if (!pending) {
            return;
        }

        if (pending.kind === 'bulk-archive') {
            archiveCustomFields(pending.fields);
            selection.clear();
        } else {
            archiveCustomFields([pending.field]);
        }

        setPending(null);
    }

    const columns: Column<CustomFieldRecord>[] = [
        {
            key: 'select',
            header: 'Select',
            width: '84px',
            headerClassName: 'px-3',
            cell: (field) => (
                <Checkbox
                    checked={selection.isSelected(field.id)}
                    onCheckedChange={() => selection.toggle(field.id)}
                    aria-label={`Select ${field.label}`}
                    data-testid={`checkbox-custom-field-${field.id}`}
                />
            ),
        },
        {
            key: 'field',
            header: 'Field',
            cell: (field) => (
                <div className="min-w-0">
                    <span className="block truncate font-medium text-[var(--navy)]">
                        {field.label}
                    </span>
                    <span className="block truncate text-xs text-[var(--slate)]">
                        {field.key}
                    </span>
                </div>
            ),
        },
        {
            key: 'form',
            header: 'Form',
            width: '150px',
            cell: (field) => (
                <span className="text-sm text-[var(--navy)]">
                    {OWNER_LABELS[field.owner]}
                </span>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            width: '130px',
            cell: (field) => (
                <StatusPill tone="info" size="sm">
                    {CUSTOM_FIELD_TYPE_LABELS[field.type]}
                </StatusPill>
            ),
        },
        {
            key: 'section',
            header: 'Section',
            width: '130px',
            cell: (field) => (
                <span className="text-xs font-medium text-[var(--slate)]">
                    {field.section}
                </span>
            ),
        },
        {
            key: 'required',
            header: 'Required',
            width: '110px',
            cell: (field) =>
                field.required ? (
                    <StatusPill tone="teal" size="sm">
                        Required
                    </StatusPill>
                ) : (
                    <span className="text-xs text-[var(--slate)]">
                        Optional
                    </span>
                ),
        },
    ];

    function rowMenu(field: CustomFieldRecord) {
        const actions: SystemRowAction[] = [
            {
                label: 'Edit',
                icon: Pencil,
                testId: 'menu-edit-custom-field',
                onSelect: () => setSheet({ mode: 'edit', field }),
            },
            {
                label: 'Archive',
                icon: Archive,
                destructive: true,
                hint: 'Archive stops it appearing on forms',
                testId: 'menu-archive-custom-field',
                onSelect: () => setPending({ kind: 'archive', field }),
            },
        ];

        return <SystemRowMenu actions={actions} />;
    }

    const copy = pending
        ? pending.kind === 'bulk-archive'
            ? {
                  title: `Archive ${pending.fields.length} custom fields?`,
                  description:
                      'They stop appearing on their forms straight away.',
                  consequences: [
                      `${bulkFormCount} ${bulkFormCount === 1 ? 'form loses' : 'forms lose'} ${pending.fields.length === 1 ? 'this field' : 'these fields'}.`,
                      'Anything already filled in keeps its value.',
                      'You can restore them from the Archived section.',
                  ],
                  confirmLabel: 'Archive',
                  destructive: true,
                  testId: 'confirm-custom-field-bulk-archive',
              }
            : {
                  title: 'Archive this custom field?',
                  description: `“${pending.field.label}” disappears from the ${OWNER_LABELS[pending.field.owner].toLowerCase()} form straight away.`,
                  consequences: [
                      'Applicants and agencies will not see it on new forms.',
                      'Anything already filled in keeps its value.',
                      'You can restore it from the Archived section.',
                  ],
                  confirmLabel: 'Archive',
                  destructive: true,
                  testId: 'confirm-custom-field-archive',
              }
        : null;

    return (
        <>
            <DataTable<CustomFieldRecord>
                columns={columns}
                data={rows}
                loading={loading}
                getRowId={(field) => field.id}
                getRowTestId={(field) => `row-custom-field-${field.id}`}
                renderRowActions={rowMenu}
                toolbar={
                    <DataTableToolbar data-testid="custom-fields-toolbar">
                        <BulkBar
                            count={selection.count}
                            label="custom fields"
                            onClear={selection.clear}
                        >
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() =>
                                    setPending({
                                        kind: 'bulk-archive',
                                        fields: rows.filter((field) =>
                                            selection.isSelected(field.id),
                                        ),
                                    })
                                }
                                data-testid="button-archive-custom-fields"
                            >
                                <Archive
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Archive selected
                            </Button>
                        </BulkBar>

                        <DataTableField
                            label="Search"
                            htmlFor="filter-custom-field-search"
                            className="basis-full sm:min-w-64 sm:flex-1 sm:basis-auto"
                        >
                            <DataTableSearch
                                id="filter-custom-field-search"
                                value={q}
                                onChange={setQ}
                                placeholder="Search custom fields by label, key or section..."
                                className="w-full"
                                data-testid="input-search-custom-fields"
                            />
                        </DataTableField>
                        <DataTableField
                            label="Form"
                            htmlFor="filter-custom-field-owner"
                        >
                            <DataTableSelect<FieldOwnerFilter>
                                id="filter-custom-field-owner"
                                value={ownerFilter}
                                onValueChange={setOwnerFilter}
                                options={OWNER_FILTER_OPTIONS}
                                ariaLabel="Filter by form"
                                data-testid="select-custom-field-owner"
                            />
                        </DataTableField>
                        <DataTableRefreshButton
                            onClick={resetFilters}
                            spinning={loading}
                            data-testid="button-refresh-custom-fields"
                        />
                    </DataTableToolbar>
                }
                emptyState={
                    <DashboardEmptyState
                        icon={isFiltered ? SearchX : SlidersHorizontal}
                        title={
                            isFiltered
                                ? 'No custom fields match your filters'
                                : 'No custom fields yet'
                        }
                        message={
                            isFiltered
                                ? 'Clear the search or pick every form to see the rest.'
                                : 'Add the first custom field to extend a form without a code change.'
                        }
                        onReset={isFiltered ? resetFilters : undefined}
                    />
                }
                data-testid="table-custom-fields"
            />

            {!loading && archivedRows.length > 0 && (
                <ArchivedSection
                    count={archivedRows.length}
                    open={showArchived}
                    onToggle={() => setShowArchived((current) => !current)}
                >
                    <ul className="flex flex-col gap-1.5">
                        {archivedRows.map((field) => (
                            <ArchivedRow
                                key={field.id}
                                name={`${field.label} · ${OWNER_LABELS[field.owner]}`}
                                usage={0}
                                onRestore={() => restoreCustomFields([field])}
                            />
                        ))}
                    </ul>
                </ArchivedSection>
            )}

            {sheet && (
                <CustomFieldSheet
                    key={sheet.mode === 'edit' ? sheet.field.id : 'new'}
                    state={state}
                    field={sheet.mode === 'edit' ? sheet.field : null}
                    onClose={() => setSheet(null)}
                    onArchive={archiveCustomFields}
                />
            )}

            {copy && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setPending(null);
                        }
                    }}
                    title={copy.title}
                    description={copy.description}
                    consequences={copy.consequences}
                    confirmLabel={copy.confirmLabel}
                    destructive={copy.destructive}
                    data-testid={copy.testId}
                    onConfirm={confirmPending}
                />
            )}
        </>
    );
}

export default function FieldsPage() {
    const state = useSystemState();
    const loading = useSystemLoading();

    const [area, setArea] = useState<Area>('options');
    const [optionAddSignal, setOptionAddSignal] = useState(0);
    const [customFieldAddSignal, setCustomFieldAddSignal] = useState(0);

    const headerAction: SystemPageAction | undefined =
        area === 'options'
            ? {
                  label: 'Add option',
                  icon: Plus,
                  onClick: () => setOptionAddSignal((count) => count + 1),
                  testId: 'button-add-option',
              }
            : area === 'custom_fields'
              ? {
                    label: 'Add custom field',
                    icon: Plus,
                    onClick: () =>
                        setCustomFieldAddSignal((count) => count + 1),
                    testId: 'button-add-custom-field',
                }
              : undefined;

    return (
        <>
            <Head title="Fields and options" />

            <SystemPage>
                <SystemPageHeader
                    title="Fields and options"
                    subtitle="The vocabulary behind every dropdown, the seeded fields on each form, and the custom fields your forms need."
                    action={headerAction}
                    data-testid="header-fields"
                />

                <SegmentedControl<Area>
                    value={area}
                    onValueChange={setArea}
                    options={AREA_OPTIONS}
                    aria-label="Fields section"
                    data-testid="segmented-area"
                />

                {area === 'options' && (
                    <OptionListsPane
                        state={state}
                        loading={loading}
                        addSignal={optionAddSignal}
                    />
                )}

                {area === 'form_fields' && (
                    <FormFieldsPane
                        state={state}
                        loading={loading}
                        onAddCustomField={() => {
                            setArea('custom_fields');
                            setCustomFieldAddSignal((count) => count + 1);
                        }}
                    />
                )}

                {area === 'custom_fields' && (
                    <CustomFieldsPane
                        state={state}
                        loading={loading}
                        addSignal={customFieldAddSignal}
                    />
                )}
            </SystemPage>
        </>
    );
}

FieldsPage.layout = {
    breadcrumbs: [
        {
            title: 'Fields and options',
            href: system.fields(),
        },
    ],
};
