import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TextBlock = {
    type: 'paragraph' | 'heading' | 'ul' | 'ol';
    lines: string[];
};

/** Groups plain-text markup into paragraphs, headings, and contiguous lists. */
export function parseFormattedText(value: string): TextBlock[] {
    const blocks: TextBlock[] = [];
    let current: TextBlock | undefined;

    for (const line of value.replaceAll('\r\n', '\n').split('\n')) {
        if (!line.trim()) {
            current = undefined;
            continue;
        }
        const type = /^\s*[•-] /.test(line)
            ? 'ul'
            : /^\s*\d+\. /.test(line)
              ? 'ol'
              : line.startsWith('# ') || /^\*\*.+:\*\*$/.test(line.trim())
                ? 'heading'
                : 'paragraph';
        const text =
            type === 'ul'
                ? line.replace(/^\s*[•-] /, '')
                : type === 'ol'
                  ? line.replace(/^\s*\d+\. /, '')
                  : line.replace(/^# /, '');

        if (!current || current.type !== type || type === 'heading') {
            current = { type, lines: [] };
            blocks.push(current);
        }
        current.lines.push(text);
    }

    return blocks;
}

function inlineText(value: string): ReactNode[] {
    const pattern =
        /(\*\*([^*]+)\*\*|\*([^*]+)\*|__([^_]+)__|\[([^\]]+)\]\(([^)]+)\))/g;
    const nodes: ReactNode[] = [];
    let offset = 0;

    for (const match of value.matchAll(pattern)) {
        nodes.push(value.slice(offset, match.index));
        const key = match.index;

        if (match[2]) {
            nodes.push(<strong key={key}>{match[2]}</strong>);
        } else if (match[3]) {
            nodes.push(<em key={key}>{match[3]}</em>);
        } else if (match[4]) {
            nodes.push(<u key={key}>{match[4]}</u>);
        } else if (/^https?:\/\//i.test(match[6])) {
            nodes.push(
                <a
                    key={key}
                    href={match[6]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--teal)]! underline! underline-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                    data-testid={`formatted-link-${key}`}
                >
                    {match[5]}
                </a>,
            );
        } else {
            nodes.push(match[0]);
        }

        offset = match.index + match[0].length;
    }

    nodes.push(value.slice(offset));
    return nodes;
}

/** Renders the editor's lightweight markup safely, without interpreting HTML. */
export function FormattedText({
    value,
    className,
}: {
    value: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'space-y-3 text-sm leading-relaxed break-words text-[#3d5365]',
                className,
            )}
        >
            {parseFormattedText(value).map((block, index) => {
                if (block.type === 'ul' || block.type === 'ol') {
                    const List = block.type;

                    return (
                        <List
                            key={index}
                            className={cn(
                                'space-y-1',
                                block.type === 'ol' && 'list-decimal pl-5',
                            )}
                        >
                            {block.lines.map((line, lineIndex) => (
                                <li
                                    key={lineIndex}
                                    className={cn(
                                        block.type === 'ul' &&
                                            'flex items-start gap-2',
                                    )}
                                >
                                    {block.type === 'ul' && (
                                        <span
                                            className="mt-2 size-1.5 shrink-0 rounded-full bg-[#3d5365]"
                                            aria-hidden="true"
                                        />
                                    )}
                                    <span>{inlineText(line)}</span>
                                </li>
                            ))}
                        </List>
                    );
                }

                const Tag = block.type === 'heading' ? 'h4' : 'p';

                return (
                    <Tag
                        key={index}
                        className={cn(
                            block.type === 'heading' &&
                                'text-sm font-bold text-[var(--navy)]',
                        )}
                    >
                        {block.lines.map((line, lineIndex) => (
                            <Fragment key={lineIndex}>
                                {lineIndex > 0 && <br />}
                                {inlineText(line)}
                            </Fragment>
                        ))}
                    </Tag>
                );
            })}
        </div>
    );
}
