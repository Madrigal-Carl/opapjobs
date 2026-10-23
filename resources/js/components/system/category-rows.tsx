import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
    ArchivedRow,
    ArchivedSection,
    InlineAddRow,
    MoveToItem,
    RenameableBody,
    RenameArchiveMenu,
    ReorderControls,
    SearchBox,
    UsageCount,
} from '@/components/system/inline-list-row';
import type {
    JobCategoryRecord,
    JobSubcategoryRecord,
} from '@/data/system/types';

/**
 * The two row flavours used by the Categories two-pane view. They are thin
 * wrappers over the shared furniture in `inline-list-row` — all the
 * behaviour (rename, reorder, archive) lives there, this file only wires
 * the category and subcategory shapes into it.
 */

export { ArchivedRow, ArchivedSection, InlineAddRow, SearchBox };

const rowClasses =
    'group flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 transition-colors hover:border-[var(--teal)] focus-within:border-[var(--teal)]';

export function CategoryRow({
    category,
    index,
    total,
    usage,
    subcategoryCount,
    selected,
    editing,
    editName,
    editError,
    onSelect,
    onStartEdit,
    onEditChange,
    onCommitEdit,
    onCancelEdit,
    onMove,
    onArchive,
}: {
    category: JobCategoryRecord;
    index: number;
    total: number;
    usage: number;
    subcategoryCount: number;
    selected: boolean;
    editing: boolean;
    editName: string;
    editError: string | null;
    onSelect: () => void;
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
            data-testid={`row-category-${category.id}`}
            className={cn(
                rowClasses,
                selected && 'border-[var(--teal)] bg-[var(--teal-light)]/40',
                dragOver && 'ring-2 ring-[var(--teal)]/40',
            )}
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
                name={category.categoryName}
                editing={editing}
                editName={editName}
                editError={editError}
                onStartEdit={onStartEdit}
                onEditChange={onEditChange}
                onCommitEdit={onCommitEdit}
                onCancelEdit={onCancelEdit}
            />

            <button
                type="button"
                onClick={onSelect}
                data-testid="category-select"
                aria-pressed={selected}
                className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
                    selected
                        ? 'bg-white/70 text-[var(--teal-ink)]'
                        : 'text-[var(--slate)] hover:text-[var(--navy)]',
                )}
            >
                {subcategoryCount} {subcategoryCount === 1 ? 'sub' : 'subs'}
            </button>

            <UsageCount count={usage} noun="post" />

            <RenameArchiveMenu onRename={onStartEdit} onArchive={onArchive} />
        </li>
    );
}

export function SubcategoryRow({
    subcategory,
    index,
    total,
    usage,
    editing,
    editName,
    editError,
    moveTargets,
    onStartEdit,
    onEditChange,
    onCommitEdit,
    onCancelEdit,
    onMove,
    onMoveTo,
    onArchive,
}: {
    subcategory: JobSubcategoryRecord;
    index: number;
    total: number;
    usage: number;
    editing: boolean;
    editName: string;
    editError: string | null;
    moveTargets: { id: number; name: string }[];
    onStartEdit: () => void;
    onEditChange: (value: string) => void;
    onCommitEdit: () => void;
    onCancelEdit: () => void;
    onMove: (targetIndex: number) => void;
    onMoveTo: (categoryId: number) => void;
    onArchive: () => void;
}) {
    const [dragOver, setDragOver] = useState(false);

    return (
        <li
            data-testid={`row-subcategory-${subcategory.id}`}
            className={cn(
                rowClasses,
                dragOver && 'ring-2 ring-[var(--teal)]/40',
            )}
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
                name={subcategory.subcategoryName}
                editing={editing}
                editName={editName}
                editError={editError}
                onStartEdit={onStartEdit}
                onEditChange={onEditChange}
                onCommitEdit={onCommitEdit}
                onCancelEdit={onCancelEdit}
            />

            <UsageCount count={usage} noun="post" />

            <RenameArchiveMenu
                onRename={onStartEdit}
                onArchive={onArchive}
                extras={
                    <MoveToItem targets={moveTargets} onMoveTo={onMoveTo} />
                }
            />
        </li>
    );
}
