import { CircleCheck, CircleHelp, Info } from 'lucide-react';
import type { ReactNode } from 'react';

/** The match report's two action-oriented sections. */
const MATCH_BLOCKS = [
    {
        key: 'strengths',
        title: 'What works in your favor',
        icon: CircleCheck,
        className: 'is-strength',
    },
    {
        key: 'prepare',
        title: 'What to prepare next',
        icon: Info,
        className: 'is-gap',
    },
] as const;

export function MatchBlockList({
    blocks,
}: {
    blocks: { strengths: string[]; gaps: string[]; tips: string[] };
}) {
    return (
        <div className="match-columns">
            {MATCH_BLOCKS.map(({ key, title, icon: Icon, className }) => (
                <div className="match-list-block" key={key}>
                    <h3>{title}</h3>
                    <ul className={`match-bullet-list ${className}`}>
                        {(key === 'prepare'
                            ? [...blocks.gaps, ...blocks.tips]
                            : blocks.strengths
                        ).map((item, index) => (
                            <li key={`${index}-${item}`}>
                                <Icon size={16} aria-hidden="true" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}

/** A listing fact in the match report's role summary. */
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
