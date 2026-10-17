import {
    CircleCheck,
    CircleHelp,
    Lightbulb,
    TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * The three sections of the match report, as a typed triple so the icon
 * can never drift from the heading it belongs to.
 */
const MATCH_BLOCKS = [
    {
        key: 'strengths',
        title: 'What works in your favour',
        icon: CircleCheck,
        className: 'is-strength',
    },
    {
        key: 'gaps',
        title: 'What to close first',
        icon: TriangleAlert,
        className: 'is-gap',
    },
    {
        key: 'tips',
        title: 'How to use this',
        icon: Lightbulb,
        className: 'is-tip',
    },
] as const;

type MatchBlockKey = (typeof MATCH_BLOCKS)[number]['key'];

/**
 * Three lists side by side: what the applicant already has, what is
 * missing, and what to do about it. Each item is one line, so the block
 * reads as a briefing rather than a report.
 */
export function MatchBlockList({
    blocks,
}: {
    blocks: Record<MatchBlockKey, string[]>;
}) {
    return (
        <div className="match-columns">
            {MATCH_BLOCKS.map(({ key, title, icon: Icon, className }) => (
                <div className="match-list-block" key={key}>
                    <h3>
                        <Icon size={13} aria-hidden="true" />
                        {title}
                    </h3>
                    <ul className={`match-bullet-list ${className}`}>
                        {blocks[key].map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}

/**
 * A labelled row inside the sticky requirements rail. The rail is the only
 * place an applicant can check what the agency asked for while filling in
 * the form, so it carries the same fields as the review step.
 */
export function ApplyRailRow({
    label,
    value,
}: {
    label: string;
    value: ReactNode;
}) {
    return (
        <div className="apply-rail-row">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

/** Explains why a field cannot be left blank. */
export function FieldError({ children }: { children: ReactNode }) {
    return (
        <p className="field-error" role="alert">
            <CircleHelp size={13} aria-hidden="true" />
            {children}
        </p>
    );
}
