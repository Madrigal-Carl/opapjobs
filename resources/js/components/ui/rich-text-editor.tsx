import { Link2, List, ListOrdered, Redo2, Undo2 } from 'lucide-react';
import { Fragment, useRef, type ComponentProps, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type RichTextEditorProps = Pick<
    ComponentProps<'textarea'>,
    'id' | 'placeholder' | 'rows' | 'aria-invalid' | 'aria-describedby'
> & {
    value: string;
    onChange: (value: string) => void;
    'data-field'?: string;
    'data-testid': string;
};

type Action =
    | 'bold'
    | 'italic'
    | 'underline'
    | 'bullet'
    | 'numbered'
    | 'heading'
    | 'link'
    | 'undo'
    | 'redo';

const tools: {
    action: Action;
    label: string;
    glyph: ReactNode;
    separator?: boolean;
}[] = [
    { action: 'bold', label: 'Bold', glyph: <b>B</b> },
    { action: 'italic', label: 'Italic', glyph: <i>I</i> },
    { action: 'underline', label: 'Underline', glyph: <u>U</u> },
    {
        action: 'bullet',
        label: 'Bullet list',
        glyph: <List className="size-3.5" />,
        separator: true,
    },
    {
        action: 'numbered',
        label: 'Numbered list',
        glyph: <ListOrdered className="size-3.5" />,
    },
    {
        action: 'heading',
        label: 'Heading',
        glyph: <b className="text-[11px]">H1</b>,
    },
    {
        action: 'link',
        label: 'Insert link',
        glyph: <Link2 className="size-3.5" />,
    },
    {
        action: 'undo',
        label: 'Undo',
        glyph: <Undo2 className="size-3.5" />,
        separator: true,
    },
    { action: 'redo', label: 'Redo', glyph: <Redo2 className="size-3.5" /> },
];

/** Plain-text markup editor with selection tools and native undo/redo support. */
export function RichTextEditor({
    value,
    onChange,
    'data-testid': testId,
    ...props
}: RichTextEditorProps) {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const selection = useRef({ start: 0, end: 0 });

    const apply = (action: Action) => {
        const input = inputRef.current;

        if (!input) {
            return;
        }
        input.focus();
        let { start, end } = selection.current;
        input.setSelectionRange(start, end);

        if (action === 'undo' || action === 'redo') {
            document.execCommand(action);
            onChange(input.value);
            return;
        }

        if (['bullet', 'numbered', 'heading'].includes(action)) {
            start = value.lastIndexOf('\n', start - 1) + 1;
            const lineEnd = value.indexOf('\n', end);
            end = lineEnd === -1 ? value.length : lineEnd;
        }

        const selected = value.slice(start, end);
        const marker =
            action === 'bold' ? '**' : action === 'italic' ? '*' : '__';
        let next = `${marker}${selected}${marker}`;

        if (
            action === 'bullet' ||
            action === 'numbered' ||
            action === 'heading'
        ) {
            next = selected
                .split('\n')
                .map(
                    (line, index) =>
                        `${action === 'bullet' ? '• ' : action === 'heading' ? '# ' : `${index + 1}. `}${line}`,
                )
                .join('\n');
        } else if (action === 'link') {
            next = `[${selected || 'text'}](https://)`;
        }

        input.setSelectionRange(start, end);
        if (!document.execCommand('insertText', false, next)) {
            input.setRangeText(next, start, end, 'end');
        }
        onChange(input.value);
        const caret =
            action === 'link' ? start + next.length - 1 : start + next.length;
        input.setSelectionRange(caret, caret);
        selection.current = { start: caret, end: caret };
    };

    return (
        <div
            className={cn(
                'overflow-hidden rounded-md border border-[var(--line)] bg-white focus-within:ring-2 focus-within:ring-[var(--teal)]/40',
                props['aria-invalid'] && 'border-destructive',
            )}
        >
            <div
                role="toolbar"
                aria-label="Text formatting"
                className="flex min-h-[34px] flex-wrap items-center border-b border-[var(--line)] bg-[var(--surface-soft)]/60 px-2"
            >
                {tools.map(({ action, label, glyph, separator }) => (
                    <Fragment key={action}>
                        {separator && (
                            <span
                                className="mx-1 h-4 w-px bg-[var(--line)]"
                                aria-hidden="true"
                            />
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            className={cn(
                                'size-7 rounded p-0 text-xs text-[var(--slate)] hover:bg-[var(--surface-soft)]',
                                (action === 'undo' || action === 'redo') &&
                                    'text-[var(--slate)]/60',
                            )}
                            aria-label={label}
                            data-testid={`${testId}-${action}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => apply(action)}
                        >
                            {glyph}
                        </Button>
                    </Fragment>
                ))}
            </div>
            <Textarea
                {...props}
                ref={inputRef}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onSelect={(event) => {
                    selection.current = {
                        start: event.currentTarget.selectionStart,
                        end: event.currentTarget.selectionEnd,
                    };
                }}
                className="min-h-[130px] resize-y rounded-none border-0 px-3 py-3 text-sm leading-relaxed text-[var(--navy)] focus:border-transparent focus:ring-0 focus-visible:outline-none"
                data-testid={testId}
            />
        </div>
    );
}
