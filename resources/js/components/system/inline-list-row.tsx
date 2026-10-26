import { forwardRef, type ReactNode } from 'react';
import {
    Archive,
    ArchiveRestore,
    ArrowDown,
    ArrowUp,
    ChevronDown,
    ChevronRight,
    FolderInput,
    GripVertical,
    Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusPill } from '@/components/dashboard/badges';
import { RowMenu } from '@/components/system/system-row-menu';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Shared row furniture for the master/detail panes (Categories, Fields).
 *
 * Every row supports the three things a small lookup needs and nothing
 * more: rename inline, reorder (drag *and* keyboard buttons), and
 * archive/restore. Split out here so the two screens cannot drift apart
 * on wording or on which verbs they offer.
 */

/** Small square icon button; 44px touch target on mobile. */
function IconButton({
    label,
    disabled,
    onClick,
    children,
    testId,
    active,
}: {
    label: string;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
    testId?: string;
    active?: boolean;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onClick}
            data-testid={testId}
            className={cn(
                'size-8 shrink-0 rounded-md text-[var(--slate)] hover:text-[var(--navy)]',
                active && 'bg-[var(--teal-light)] text-[var(--teal-ink)]',
            )}
        >
            {children}
        </Button>
    );
}

/** Inline "add a row" strip pinned to the top of a pane. */
export const InlineAddRow = forwardRef<
    HTMLInputElement,
    {
        label: string;
        value: string;
        error: string | null;
        onChange: (value: string) => void;
        onSave: () => void;
        onCancel: () => void;
    }
>(function InlineAddRow(
    { label, value, error, onChange, onSave, onCancel },
    ref,
) {
    return (
        <div
            data-testid="inline-add-row"
            className="rounded-lg border border-[var(--teal)] bg-[var(--teal-light)]/40 p-2.5"
        >
            <Label className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-[var(--slate)] uppercase">
                {label}
            </Label>
            <Input
                ref={ref}
                value={value}
                aria-invalid={error !== null}
                aria-describedby={error ? 'inline-add-error' : undefined}
                placeholder={label}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        onSave();
                    }
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        onCancel();
                    }
                }}
                data-testid="inline-add-input"
            />
            {error && (
                <p
                    id="inline-add-error"
                    role="alert"
                    className="mt-1.5 text-xs font-medium text-[var(--danger)]"
                >
                    {error}
                </p>
            )}
            <div className="mt-2 flex items-center justify-end gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    data-testid="inline-add-cancel"
                >
                    Cancel
                </Button>
                <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={onSave}
                    data-testid="inline-add-save"
                >
                    Add
                </Button>
            </div>
        </div>
    );
});

/** Collapsed "Archived (n)" strip at the foot of a pane. */
export function ArchivedSection({
    count,
    open,
    onToggle,
    children,
}: {
    count: number;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    return (
        <div className="mt-1 rounded-lg border border-dashed border-[var(--line)]">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                data-testid="archived-toggle"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--slate)] transition-colors hover:text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
            >
                {open ? (
                    <ChevronDown className="size-4" aria-hidden="true" />
                ) : (
                    <ChevronRight className="size-4" aria-hidden="true" />
                )}
                Archived ({count})
            </button>
            {open && (
                <div className="border-t border-[var(--line)] p-2">
                    {children}
                </div>
            )}
        </div>
    );
}

/** An archived row: dimmed, with Restore as its only action. */
export function ArchivedRow({
    name,
    usage,
    onRestore,
}: {
    name: string;
    usage: number;
    onRestore: () => void;
}) {
    return (
        <li
            data-testid="archived-row"
            className="flex items-center gap-3 rounded-md px-2 py-1.5 opacity-70"
        >
            <Archive
                className="size-4 shrink-0 text-[var(--slate)]"
                aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-sm text-[var(--navy)]">
                {name}
            </span>
            {usage > 0 && (
                <span className="shrink-0 text-xs text-[var(--slate)]">
                    {usage} job {usage === 1 ? 'post' : 'posts'}
                </span>
            )}
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRestore}
                data-testid="archived-restore"
            >
                <ArchiveRestore className="size-4" aria-hidden="true" />
                Restore
            </Button>
        </li>
    );
}

type RenameableRowProps = {
    name: string;
    /** Human-readable context shown in the menu, e.g. a parent name. */
    editing: boolean;
    editName: string;
    editError: string | null;
    onStartEdit: () => void;
    onEditChange: (value: string) => void;
    onCommitEdit: () => void;
    onCancelEdit: () => void;
    /**
     * Master/detail rows use the body to *select* rather than rename:
     * clicking the middle of a row has to open that row's detail pane, so
     * rename moves to the `…` menu where it already lives. Omit it and the
     * body stays a rename trigger, which is what the subcategory and
     * Fields rows want — they have no pane to open.
     */
    onActivate?: () => void;
    /** Marks the row as the one the body has activated. */
    active?: boolean;
    activateTestId?: string;
};

/**
 * The editable half of a row. When not editing it shows plain text that
 * reads as a button; when editing it swaps to an input wired for Enter and
 * Escape, and surfaces the uniqueness message inline.
 */
export function RenameableBody({
    name,
    editing,
    editName,
    editError,
    onStartEdit,
    onEditChange,
    onCommitEdit,
    onCancelEdit,
    onActivate,
    active,
    activateTestId,
}: RenameableRowProps) {
    if (editing) {
        return (
            <div className="min-w-0 flex-1" data-testid="row-rename">
                <Input
                    autoFocus
                    value={editName}
                    aria-invalid={editError !== null}
                    aria-label="Name"
                    onChange={(event) => onEditChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            onCommitEdit();
                        }
                        if (event.key === 'Escape') {
                            event.preventDefault();
                            onCancelEdit();
                        }
                    }}
                    onBlur={onCommitEdit}
                    data-testid="row-rename-input"
                    className="h-8"
                />
                {editError && (
                    <p
                        role="alert"
                        className="mt-1 text-xs font-medium text-[var(--danger)]"
                    >
                        {editError}
                    </p>
                )}
            </div>
        );
    }

    if (onActivate) {
        return (
            <button
                type="button"
                onClick={onActivate}
                data-testid={activateTestId}
                aria-pressed={active}
                className="min-w-0 flex-1 truncate rounded text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
            >
                <span
                    className={
                        active
                            ? 'text-[var(--teal-ink)]'
                            : 'text-[var(--navy)] transition-colors group-hover:text-[var(--teal-ink)]'
                    }
                >
                    {name}
                </span>
                <ChevronRight
                    className={cn(
                        'ml-1 inline size-3 text-[var(--slate)] transition-opacity motion-reduce:transition-none',
                        active
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100',
                    )}
                    aria-hidden="true"
                />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onStartEdit}
            data-testid="row-rename-trigger"
            className="min-w-0 flex-1 truncate rounded text-left text-sm font-medium text-[var(--navy)] transition-colors hover:text-[var(--teal-ink)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none"
        >
            {name}
            <Pencil
                className="ml-1.5 inline size-3 text-[var(--slate)] opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
            />
        </button>
    );
}

/** Drag handle + keyboard move buttons, shared by every reorderable pane. */
export function ReorderControls({
    index,
    total,
    onMove,
    onDragStart,
    onDragOver,
    onDrop,
    canDrop,
}: {
    index: number;
    total: number;
    onMove: (targetIndex: number) => void;
    onDragStart: () => void;
    onDragOver: (event: React.DragEvent) => void;
    onDrop: () => void;
    canDrop: boolean;
}) {
    return (
        <>
            <span
                draggable
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                role="button"
                tabIndex={0}
                aria-label="Drag to reorder"
                data-testid="drag-handle"
                className={cn(
                    'shrink-0 cursor-grab text-[var(--slate)] active:cursor-grabbing',
                    'focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 focus-visible:outline-none',
                    canDrop && 'ring-2 ring-[var(--teal)]/40',
                )}
            >
                <GripVertical className="size-4" aria-hidden="true" />
            </span>
            <IconButton
                label="Move up"
                disabled={index === 0}
                onClick={() => onMove(index - 1)}
                testId="row-move-up"
            >
                <ArrowUp className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton
                label="Move down"
                disabled={index === total - 1}
                onClick={() => onMove(index + 1)}
                testId="row-move-down"
            >
                <ArrowDown className="size-4" aria-hidden="true" />
            </IconButton>
        </>
    );
}

/** The `…` menu with Rename / Archive (or Restore) and optional extras. */
export function RenameArchiveMenu({
    onRename,
    onArchive,
    extras,
}: {
    onRename: () => void;
    onArchive?: () => void;
    onRestore?: () => void;
    extras?: ReactNode;
}) {
    return (
        <RowMenu>
            <DropdownMenuItem onSelect={onRename} data-testid="menu-rename">
                <Pencil className="size-4" aria-hidden="true" />
                Rename
            </DropdownMenuItem>
            {extras}
            {onArchive && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[11px] text-[var(--slate)]">
                        Archive stops it appearing in pickers
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                        onSelect={onArchive}
                        data-testid="menu-archive"
                        className="text-[var(--danger)] focus:text-[var(--danger)]"
                    >
                        <Archive className="size-4" aria-hidden="true" />
                        Archive
                    </DropdownMenuItem>
                </>
            )}
        </RowMenu>
    );
}

/** Used by panes that offer "move to another parent". */
export function MoveToItem({
    targets,
    onMoveTo,
}: {
    targets: { id: number; name: string }[];
    onMoveTo: (id: number) => void;
}) {
    if (targets.length === 0) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <DropdownMenuItem
                    onSelect={(event) => event.preventDefault()}
                    data-testid="menu-move-to"
                >
                    <FolderInput className="size-4" aria-hidden="true" />
                    Move to another category
                    <ChevronRight
                        className="ml-auto size-4"
                        aria-hidden="true"
                    />
                </DropdownMenuItem>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="left" className="w-56">
                {targets.map((target) => (
                    <DropdownMenuItem
                        key={target.id}
                        onSelect={() => onMoveTo(target.id)}
                        data-testid={`menu-move-to-${target.id}`}
                    >
                        <FolderInput className="size-4" aria-hidden="true" />
                        {target.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** Search input sized for a pane header. */
export function SearchBox({
    value,
    onChange,
    label,
}: {
    value: string;
    onChange: (value: string) => void;
    label: string;
}) {
    return (
        <div className="relative">
            <Input
                value={value}
                aria-label={label}
                placeholder="Search"
                onChange={(event) => onChange(event.target.value)}
                data-testid="search-box"
                className="h-8 w-40 pl-8 text-sm"
            />
            <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--slate)]"
            >
                <svg
                    className="size-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                </svg>
            </span>
        </div>
    );
}

/** Usage count pill shown on every row so archive impact is visible. */
export function UsageCount({ count, noun }: { count: number; noun: string }) {
    if (count === 0) {
        return (
            <span className="shrink-0 text-xs text-[var(--slate)]">
                Not used
            </span>
        );
    }

    return (
        <StatusPill tone="teal" size="sm">
            {count} {noun}
            {count === 1 ? '' : 's'}
        </StatusPill>
    );
}
