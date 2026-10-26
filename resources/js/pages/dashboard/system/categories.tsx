import { Head } from '@inertiajs/react';
import { FolderTree, Plus, SearchX } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/system/confirm-dialog';
import {
    ArchivedRow,
    ArchivedSection,
    CategoryRow,
    InlineAddRow,
    SearchBox,
    SubcategoryRow,
} from '@/components/system/category-rows';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
import { SystemPage } from '@/components/system/system-page';
import { SystemPageHeader } from '@/components/system/system-page-header';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
    categorySubcategories,
    categoryUsage,
    subcategoryUsage,
} from '@/data/system/selectors';
import { commitSystemChange, useSystemState } from '@/data/system/store';
import * as systemRoutes from '@/routes/dashboard/system';
import type { Pathway } from '@/types/agency';
import type { JobSubcategoryRecord } from '@/data/system/types';
import type { SystemState } from '@/data/system/store';

/**
 * Categories and subcategories (§4.8).
 *
 * The only two lookups the app maintains (§6), so both are renamed inline,
 * reordered by drag or move buttons, and archived — never deleted. The two
 * panes are linked: the left selects a category and the right shows its
 * subcategories. Uniqueness is per pathway, which is why switching the
 * segmented control can reveal a name that was fine on the other side.
 */

type PaneMode = 'category' | 'subcategory';

function labelForPathway(pathway: Pathway): string {
    return pathway === 'landbased' ? 'Land-based' : 'Sea-based';
}

/** True when `name` already exists among active rows of the same scope. */
function isDuplicateName(
    state: SystemState,
    mode: PaneMode,
    pathway: Pathway,
    name: string,
    categoryId: number,
    exceptId?: number,
): boolean {
    const needle = name.trim().toLowerCase();

    if (mode === 'category') {
        return state.categories.some(
            (category) =>
                category.id !== exceptId &&
                category.pathway === pathway &&
                category.deletedAt === null &&
                category.categoryName.trim().toLowerCase() === needle,
        );
    }

    const siblingIds = new Set(
        state.subcategories
            .filter((subcategory) => subcategory.jobCategoryId === categoryId)
            .map((subcategory) => subcategory.id),
    );

    return state.subcategories.some(
        (subcategory) =>
            subcategory.id !== exceptId &&
            siblingIds.has(subcategory.id) &&
            subcategory.deletedAt === null &&
            subcategory.subcategoryName.trim().toLowerCase() === needle,
    );
}

function duplicatesMessage(
    mode: PaneMode,
    pathway: Pathway,
    name: string,
): string {
    return mode === 'category'
        ? `A category named ${name.trim()} already exists in ${labelForPathway(pathway)}.`
        : `A subcategory named ${name.trim()} already exists here.`;
}

export default function SystemCategories() {
    const state = useSystemState();

    const [pathway, setPathway] = useState<Pathway>('landbased');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
        null,
    );
    const [addingTo, setAddingTo] = useState<PaneMode | null>(null);
    const [draftName, setDraftName] = useState('');
    const [draftError, setDraftError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editError, setEditError] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [search, setSearch] = useState('');
    const [archiving, setArchiving] = useState<{
        mode: PaneMode;
        id: number;
        name: string;
        usage: number;
    } | null>(null);

    const draftInputRef = useRef<HTMLInputElement>(null);

    const categories = useMemo(
        () =>
            state.categories
                .filter((category) => category.pathway === pathway)
                .sort((a, b) => a.sortOrder - b.sortOrder),
        [state.categories, pathway],
    );

    const activeCategories = categories.filter((c) => c.deletedAt === null);
    const archivedCategories = categories.filter((c) => c.deletedAt !== null);

    // Fall back to the first category when the selected one leaves the pane,
    // so the right-hand pane is never pointing at nothing.
    const selectedCategory =
        categories.find(
            (category) =>
                category.id === selectedCategoryId &&
                category.deletedAt === null,
        ) ??
        activeCategories[0] ??
        null;

    const activeSubcategories = selectedCategory
        ? categorySubcategories(state, selectedCategory.id)
        : [];
    const archivedSubcategories = selectedCategory
        ? categorySubcategories(state, selectedCategory.id, true).filter(
              (subcategory) => subcategory.deletedAt !== null,
          )
        : [];

    const matchingSubcategoryCount = activeSubcategories.length;

    const filteredActiveSubcategories = search.trim()
        ? activeSubcategories.filter((subcategory) =>
              subcategory.subcategoryName
                  .toLowerCase()
                  .includes(search.trim().toLowerCase()),
          )
        : activeSubcategories;

    useEffect(() => {
        if (addingTo !== null) {
            draftInputRef.current?.focus();
        }
    }, [addingTo]);

    function startAdd(mode: PaneMode) {
        setAddingTo(mode);
        setDraftName('');
        setDraftError(null);
        setEditingId(null);
    }

    function cancelAdd() {
        setAddingTo(null);
        setDraftName('');
        setDraftError(null);
    }

    function commitAdd(mode: PaneMode) {
        const name = draftName.trim();

        if (name === '') {
            setDraftError('Enter a name.');
            return;
        }

        if (
            isDuplicateName(
                state,
                mode,
                pathway,
                name,
                selectedCategory?.id ?? 0,
            )
        ) {
            setDraftError(duplicatesMessage(mode, pathway, name));
            return;
        }

        if (mode === 'category') {
            const nextSort =
                activeCategories.reduce(
                    (max, category) => Math.max(max, category.sortOrder),
                    -1,
                ) + 1;
            const nextId = state.nextId;

            commitSystemChange({
                action: 'create',
                subjectType: 'category',
                subjectId: nextId,
                subjectLabel: name,
                changes: [{ field: 'Category name', from: null, to: name }],
                apply: (current) => ({
                    ...current,
                    nextId: current.nextId + 1,
                    categories: [
                        ...current.categories,
                        {
                            id: nextId,
                            pathway,
                            categoryName: name,
                            sortOrder: nextSort,
                            deletedAt: null,
                        },
                    ],
                }),
            });

            setSelectedCategoryId(nextId);
        } else {
            if (!selectedCategory) {
                return;
            }

            const nextSort =
                activeSubcategories.reduce(
                    (max, subcategory) => Math.max(max, subcategory.sortOrder),
                    -1,
                ) + 1;
            const nextId = state.nextId;

            commitSystemChange({
                action: 'create',
                subjectType: 'subcategory',
                subjectId: nextId,
                subjectLabel: name,
                changes: [{ field: 'Subcategory name', from: null, to: name }],
                apply: (current) => ({
                    ...current,
                    nextId: current.nextId + 1,
                    subcategories: [
                        ...current.subcategories,
                        {
                            id: nextId,
                            jobCategoryId: selectedCategory.id,
                            subcategoryName: name,
                            sortOrder: nextSort,
                            deletedAt: null,
                        },
                    ],
                }),
            });
        }

        toast.success(`${name} added.`);
        cancelAdd();
    }

    function startEdit(id: number, current: string) {
        setEditingId(id);
        setEditName(current);
        setEditError(null);
        setAddingTo(null);
    }

    function cancelEdit() {
        setEditingId(null);
        setEditName('');
        setEditError(null);
    }

    function commitEdit(mode: PaneMode, id: number, original: string) {
        const name = editName.trim();

        if (name === '') {
            setEditError('Enter a name.');
            return;
        }

        if (
            isDuplicateName(
                state,
                mode,
                pathway,
                name,
                selectedCategory?.id ?? 0,
                id,
            )
        ) {
            setEditError(duplicatesMessage(mode, pathway, name));
            return;
        }

        if (name === original) {
            cancelEdit();
            return;
        }

        commitSystemChange({
            action: 'rename',
            subjectType: mode === 'category' ? 'category' : 'subcategory',
            subjectId: id,
            subjectLabel: name,
            changes: [
                {
                    field:
                        mode === 'category'
                            ? 'Category name'
                            : 'Subcategory name',
                    from: original,
                    to: name,
                },
            ],
            apply: (current) => ({
                ...current,
                categories:
                    mode === 'category'
                        ? current.categories.map((category) =>
                              category.id === id
                                  ? { ...category, categoryName: name }
                                  : category,
                          )
                        : current.categories,
                subcategories:
                    mode === 'subcategory'
                        ? current.subcategories.map((subcategory) =>
                              subcategory.id === id
                                  ? { ...subcategory, subcategoryName: name }
                                  : subcategory,
                          )
                        : current.subcategories,
            }),
        });

        toast.success('Name updated.');
        cancelEdit();
    }

    /**
     * Reorders a pane by writing fresh `sortOrder` values. Used by the move
     * buttons and by drop, which resolves to a target index first so both
     * paths share one code path.
     */
    function reorder(
        mode: PaneMode,
        ordered: { id: number }[],
        fromId: number,
        targetIndex: number,
    ) {
        const fromIndex = ordered.findIndex((entry) => entry.id === fromId);

        if (fromIndex === -1 || targetIndex === fromIndex) {
            return;
        }

        const next = [...ordered];
        const [moved] = next.splice(fromIndex, 1);

        if (!moved) {
            return;
        }

        next.splice(targetIndex, 0, moved);

        const ids = new Set(next.map((entry) => entry.id));

        commitSystemChange({
            action: 'reorder',
            subjectType: mode === 'category' ? 'category' : 'subcategory',
            subjectId: fromId,
            subjectLabel: `Position ${targetIndex + 1} of ${next.length}`,
            changes: [
                {
                    field: 'Sort order',
                    from: fromIndex + 1,
                    to: targetIndex + 1,
                },
            ],
            apply: (current) => ({
                ...current,
                categories:
                    mode === 'category'
                        ? current.categories.map((category) =>
                              ids.has(category.id)
                                  ? {
                                        ...category,
                                        sortOrder: next.findIndex(
                                            (entry) => entry.id === category.id,
                                        ),
                                    }
                                  : category,
                          )
                        : current.categories,
                subcategories:
                    mode === 'subcategory'
                        ? current.subcategories.map((subcategory) =>
                              ids.has(subcategory.id)
                                  ? {
                                        ...subcategory,
                                        sortOrder: next.findIndex(
                                            (entry) =>
                                                entry.id === subcategory.id,
                                        ),
                                    }
                                  : subcategory,
                          )
                        : current.subcategories,
            }),
        });
    }

    function archive(mode: PaneMode, id: number, name: string, usage: number) {
        commitSystemChange({
            action: 'archive',
            subjectType: mode === 'category' ? 'category' : 'subcategory',
            subjectId: id,
            subjectLabel: name,
            changes: [
                { field: 'Archived', from: false, to: true },
                { field: 'Job posts using it', from: usage, to: usage },
            ],
            apply: (current) => ({
                ...current,
                categories:
                    mode === 'category'
                        ? current.categories.map((category) =>
                              category.id === id
                                  ? {
                                        ...category,
                                        deletedAt: new Date().toISOString(),
                                    }
                                  : category,
                          )
                        : current.categories,
                subcategories:
                    mode === 'subcategory'
                        ? current.subcategories.map((subcategory) =>
                              subcategory.id === id
                                  ? {
                                        ...subcategory,
                                        deletedAt: new Date().toISOString(),
                                    }
                                  : subcategory,
                          )
                        : current.subcategories,
            }),
        });

        setArchiving(null);
        toast.success(`“${name}” archived.`, {
            action: {
                label: 'Undo',
                onClick: () => restore(mode, id, name),
            },
            duration: 6000,
        });
    }

    function restore(mode: PaneMode, id: number, name: string) {
        commitSystemChange({
            action: 'restore',
            subjectType: mode === 'category' ? 'category' : 'subcategory',
            subjectId: id,
            subjectLabel: name,
            changes: [{ field: 'Archived', from: true, to: false }],
            apply: (current) => ({
                ...current,
                categories:
                    mode === 'category'
                        ? current.categories.map((category) =>
                              category.id === id
                                  ? { ...category, deletedAt: null }
                                  : category,
                          )
                        : current.categories,
                subcategories:
                    mode === 'subcategory'
                        ? current.subcategories.map((subcategory) =>
                              subcategory.id === id
                                  ? { ...subcategory, deletedAt: null }
                                  : subcategory,
                          )
                        : current.subcategories,
            }),
        });

        toast.success(`“${name}” restored.`);
    }

    /**
     * Moving a subcategory to a different category is only legal within a
     * pathway (§4.8), so the menu offers the sibling categories of the
     * current one and nothing else.
     */
    function moveSubcategory(
        subcategory: JobSubcategoryRecord,
        targetId: number,
    ) {
        const target = state.categories.find(
            (category) => category.id === targetId,
        );

        if (!target) {
            return;
        }

        commitSystemChange({
            action: 'move',
            subjectType: 'subcategory',
            subjectId: subcategory.id,
            subjectLabel: `${subcategory.subcategoryName} → ${target.categoryName}`,
            changes: [
                {
                    field: 'Parent category',
                    from:
                        state.categories.find(
                            (category) =>
                                category.id === subcategory.jobCategoryId,
                        )?.categoryName ?? '—',
                    to: target.categoryName,
                },
            ],
            apply: (current) => ({
                ...current,
                subcategories: current.subcategories.map((entry) =>
                    entry.id === subcategory.id
                        ? { ...entry, jobCategoryId: targetId }
                        : entry,
                ),
            }),
        });

        toast.success(
            `“${subcategory.subcategoryName}” moved to ${target.categoryName}.`,
        );
    }

    const otherCategories = categories
        .filter(
            (category) =>
                category.deletedAt === null &&
                category.id !== selectedCategory?.id,
        )
        .map((category) => ({
            id: category.id,
            name: category.categoryName,
        }));

    return (
        <>
            <Head title="Categories" />

            <SystemPage>
                <SystemPageHeader
                    title="Categories"
                    subtitle="Job posts can only pick a subcategory of their Agency's pathway."
                    action={{
                        label: 'Add category',
                        icon: Plus,
                        onClick: () => startAdd('category'),
                        testId: 'button-category-add',
                    }}
                    data-testid="header-categories"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-[var(--slate)] uppercase">
                            Pathway
                        </span>
                        <SegmentedControl<Pathway>
                            value={pathway}
                            onValueChange={(next) => {
                                setPathway(next);
                                setSelectedCategoryId(null);
                                cancelAdd();
                                cancelEdit();
                            }}
                            options={[
                                { value: 'landbased', label: 'Land-based' },
                                { value: 'seabased', label: 'Sea-based' },
                            ]}
                            aria-label="Pathway"
                            data-testid="segmented-pathway"
                        />
                    </div>
                    <p className="text-sm text-[var(--slate)]">
                        {labelForPathway(pathway)} · {activeCategories.length}{' '}
                        {activeCategories.length === 1
                            ? 'category'
                            : 'categories'}
                    </p>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                    {/* ---------- Left pane: categories ---------- */}
                    <section
                        className="flex flex-col overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm"
                        data-testid="pane-categories"
                    >
                        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
                            <div className="min-w-0">
                                <h2 className="font-serif text-lg font-bold tracking-[-0.02em] text-[var(--navy)]">
                                    Categories
                                </h2>
                                <p className="text-xs text-[var(--slate)]">
                                    Pick a category to edit its subcategories.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => startAdd('category')}
                                data-testid="button-pane-category-add"
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Add
                            </Button>
                        </header>

                        <div className="flex flex-col gap-3 p-4">
                            {addingTo === 'category' && (
                                <InlineAddRow
                                    ref={draftInputRef}
                                    label="Category name"
                                    value={draftName}
                                    error={draftError}
                                    onChange={setDraftName}
                                    onSave={() => commitAdd('category')}
                                    onCancel={cancelAdd}
                                />
                            )}

                            <ul className="flex flex-col gap-1.5">
                                {activeCategories.map((category, index) => (
                                    <CategoryRow
                                        key={category.id}
                                        category={category}
                                        index={index}
                                        total={activeCategories.length}
                                        usage={categoryUsage(
                                            state,
                                            category.id,
                                        )}
                                        subcategoryCount={
                                            categorySubcategories(
                                                state,
                                                category.id,
                                            ).length
                                        }
                                        selected={
                                            selectedCategory?.id === category.id
                                        }
                                        editing={editingId === category.id}
                                        editName={editName}
                                        editError={editError}
                                        onSelect={() =>
                                            setSelectedCategoryId(category.id)
                                        }
                                        onStartEdit={() =>
                                            startEdit(
                                                category.id,
                                                category.categoryName,
                                            )
                                        }
                                        onEditChange={setEditName}
                                        onCommitEdit={() =>
                                            commitEdit(
                                                'category',
                                                category.id,
                                                category.categoryName,
                                            )
                                        }
                                        onCancelEdit={cancelEdit}
                                        onMove={(targetIndex) =>
                                            reorder(
                                                'category',
                                                activeCategories,
                                                category.id,
                                                targetIndex,
                                            )
                                        }
                                        onArchive={() =>
                                            setArchiving({
                                                mode: 'category',
                                                id: category.id,
                                                name: category.categoryName,
                                                usage: categoryUsage(
                                                    state,
                                                    category.id,
                                                ),
                                            })
                                        }
                                    />
                                ))}
                            </ul>

                            {activeCategories.length === 0 && (
                                <DashboardEmptyState
                                    icon={FolderTree}
                                    title={`No ${labelForPathway(pathway)} categories yet`}
                                    message="Add the first category to start grouping job posts."
                                />
                            )}

                            {archivedCategories.length > 0 && (
                                <ArchivedSection
                                    count={archivedCategories.length}
                                    open={showArchived}
                                    onToggle={() =>
                                        setShowArchived((current) => !current)
                                    }
                                >
                                    <ul className="flex flex-col gap-1.5">
                                        {archivedCategories.map((category) => (
                                            <ArchivedRow
                                                key={category.id}
                                                name={category.categoryName}
                                                usage={categoryUsage(
                                                    state,
                                                    category.id,
                                                )}
                                                onRestore={() =>
                                                    restore(
                                                        'category',
                                                        category.id,
                                                        category.categoryName,
                                                    )
                                                }
                                            />
                                        ))}
                                    </ul>
                                </ArchivedSection>
                            )}
                        </div>
                    </section>

                    {/* ---------- Right pane: subcategories ---------- */}
                    <section
                        className="flex flex-col overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm"
                        data-testid="pane-subcategories"
                    >
                        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
                            <div className="min-w-0">
                                <h2 className="font-serif text-lg font-bold tracking-[-0.02em] text-[var(--navy)]">
                                    {selectedCategory?.categoryName ??
                                        'Subcategories'}
                                </h2>
                                <p className="text-xs text-[var(--slate)]">
                                    {matchingSubcategoryCount}{' '}
                                    {matchingSubcategoryCount === 1
                                        ? 'subcategory'
                                        : 'subcategories'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <SearchBox
                                    value={search}
                                    onChange={setSearch}
                                    label="Search subcategories"
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => startAdd('subcategory')}
                                    disabled={!selectedCategory}
                                    data-testid="button-pane-subcategory-add"
                                >
                                    <Plus
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Add
                                </Button>
                            </div>
                        </header>

                        <div className="flex flex-col gap-3 p-4">
                            {addingTo === 'subcategory' && (
                                <InlineAddRow
                                    ref={draftInputRef}
                                    label="Subcategory name"
                                    value={draftName}
                                    error={draftError}
                                    onChange={setDraftName}
                                    onSave={() => commitAdd('subcategory')}
                                    onCancel={cancelAdd}
                                />
                            )}

                            {selectedCategory ? (
                                <>
                                    <ul className="flex flex-col gap-1.5">
                                        {filteredActiveSubcategories.map(
                                            (subcategory, index) => (
                                                <SubcategoryRow
                                                    key={subcategory.id}
                                                    subcategory={subcategory}
                                                    index={index}
                                                    total={
                                                        filteredActiveSubcategories.length
                                                    }
                                                    usage={subcategoryUsage(
                                                        state,
                                                        subcategory.id,
                                                    )}
                                                    editing={
                                                        editingId ===
                                                        subcategory.id
                                                    }
                                                    editName={editName}
                                                    editError={editError}
                                                    moveTargets={
                                                        otherCategories
                                                    }
                                                    onStartEdit={() =>
                                                        startEdit(
                                                            subcategory.id,
                                                            subcategory.subcategoryName,
                                                        )
                                                    }
                                                    onEditChange={setEditName}
                                                    onCommitEdit={() =>
                                                        commitEdit(
                                                            'subcategory',
                                                            subcategory.id,
                                                            subcategory.subcategoryName,
                                                        )
                                                    }
                                                    onCancelEdit={cancelEdit}
                                                    onMove={(targetIndex) =>
                                                        reorder(
                                                            'subcategory',
                                                            filteredActiveSubcategories,
                                                            subcategory.id,
                                                            targetIndex,
                                                        )
                                                    }
                                                    onMoveTo={(categoryId) =>
                                                        moveSubcategory(
                                                            subcategory,
                                                            categoryId,
                                                        )
                                                    }
                                                    onArchive={() =>
                                                        setArchiving({
                                                            mode: 'subcategory',
                                                            id: subcategory.id,
                                                            name: subcategory.subcategoryName,
                                                            usage: subcategoryUsage(
                                                                state,
                                                                subcategory.id,
                                                            ),
                                                        })
                                                    }
                                                />
                                            ),
                                        )}
                                    </ul>

                                    {filteredActiveSubcategories.length ===
                                        0 && (
                                        <DashboardEmptyState
                                            icon={
                                                search.trim()
                                                    ? SearchX
                                                    : FolderTree
                                            }
                                            title={
                                                search.trim()
                                                    ? 'No matching subcategories'
                                                    : 'No subcategories yet'
                                            }
                                            message={
                                                search.trim()
                                                    ? 'Clear the search to see every subcategory of this category.'
                                                    : 'Add the first subcategory applicants will pick from.'
                                            }
                                            onReset={
                                                search.trim()
                                                    ? () => setSearch('')
                                                    : undefined
                                            }
                                        />
                                    )}

                                    {archivedSubcategories.length > 0 && (
                                        <ArchivedSection
                                            count={archivedSubcategories.length}
                                            open={showArchived}
                                            onToggle={() =>
                                                setShowArchived(
                                                    (current) => !current,
                                                )
                                            }
                                        >
                                            <ul className="flex flex-col gap-1.5">
                                                {archivedSubcategories.map(
                                                    (subcategory) => (
                                                        <ArchivedRow
                                                            key={subcategory.id}
                                                            name={
                                                                subcategory.subcategoryName
                                                            }
                                                            usage={subcategoryUsage(
                                                                state,
                                                                subcategory.id,
                                                            )}
                                                            onRestore={() =>
                                                                restore(
                                                                    'subcategory',
                                                                    subcategory.id,
                                                                    subcategory.subcategoryName,
                                                                )
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </ul>
                                        </ArchivedSection>
                                    )}
                                </>
                            ) : (
                                <DashboardEmptyState
                                    icon={FolderTree}
                                    title="Pick a category"
                                    message="Choose a category on the left to see and edit its subcategories."
                                />
                            )}
                        </div>
                    </section>
                </div>
            </SystemPage>

            <ConfirmDialog
                open={archiving !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setArchiving(null);
                    }
                }}
                title={`Archive ${archiving?.mode ?? 'category'}?`}
                description={`“${archiving?.name ?? ''}” stops appearing in pickers straight away.`}
                consequences={[
                    ...(archiving?.usage
                        ? [
                              `${archiving.usage} job ${archiving.usage === 1 ? 'post still uses' : 'posts still use'} it — it stays visible on ${archiving.usage === 1 ? 'that post' : 'those posts'}.`,
                          ]
                        : ['No job posts use it yet.']),
                    'Applicants will not be able to choose it on new applications.',
                    'You can restore it at any time.',
                ]}
                confirmLabel="Archive"
                destructive
                data-testid="confirm-category-archive"
                onConfirm={() => {
                    if (archiving) {
                        archive(
                            archiving.mode,
                            archiving.id,
                            archiving.name,
                            archiving.usage,
                        );
                    }
                }}
            />
        </>
    );
}

SystemCategories.layout = {
    breadcrumbs: [
        {
            title: 'Categories',
            href: systemRoutes.categories(),
        },
    ],
};
