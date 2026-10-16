import {
    AlertCircle,
    CheckCircle2,
    Lightbulb,
    Sparkles,
    Target,
    ThumbsUp,
} from 'lucide-react';
import { categoryTone, overallMatchMeta } from '@/data/match-analysis';
import type { MatchAnalysis, MatchTone } from '@/types/application-draft';
import { cn } from '@/lib/utils';

const TONE_TEXT: Record<MatchTone, string> = {
    teal: 'text-[var(--teal)]',
    amber: 'text-[var(--amber)]',
    navy: 'text-[var(--navy)]',
    slate: 'text-[var(--slate)]',
};

const TONE_BAR: Record<MatchTone, string> = {
    teal: 'bg-[var(--teal)]',
    amber: 'bg-[var(--amber)]',
    navy: 'bg-[var(--navy)]',
    slate: 'bg-[var(--slate)]',
};

function AnalysisLoading() {
    return (
        <div
            className="flex flex-col items-center gap-4 py-10 text-center"
            role="status"
            aria-live="polite"
            data-testid="status-match-loading"
        >
            <div className="flex items-center gap-2">
                <Sparkles
                    size={20}
                    className="animate-pulse text-[var(--teal)] motion-reduce:animate-none"
                    aria-hidden="true"
                />
                <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--slate)] uppercase">
                    Analyzing your profile…
                </span>
            </div>
            <div className="applications-loader" aria-hidden="true">
                <span className="applications-loader-dot" />
                <span className="applications-loader-dot" />
                <span className="applications-loader-dot" />
            </div>
        </div>
    );
}

/**
 * Step one of the apply wizard: a seeded score for the applicant's resume
 * against this listing. `null` keeps the analysis loader on screen.
 */
export function MatchAnalysisStep({
    analysis,
}: {
    analysis: MatchAnalysis | null;
}) {
    if (!analysis) {
        return <AnalysisLoading />;
    }

    const { label, tone } = overallMatchMeta(analysis.overall);

    return (
        <div className="space-y-8">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-8">
                <div
                    className={cn(
                        'flex size-32 shrink-0 flex-col items-center justify-center rounded-full border-8 border-[var(--teal-light)] bg-white shadow-sm',
                        TONE_TEXT[tone],
                    )}
                    role="img"
                    aria-label={`Overall match ${analysis.overall} out of 100, ${label}`}
                >
                    <span className="font-serif text-3xl leading-none font-extrabold">
                        {analysis.overall.toFixed(1)}%
                    </span>
                    <span className="mt-1 font-mono text-[9px] tracking-[0.1em] text-[var(--slate)] uppercase">
                        {label}
                    </span>
                </div>
                <div className="min-w-0 text-center sm:text-left">
                    <p className="font-mono text-[10px] tracking-[0.12em] text-[var(--teal)] uppercase">
                        Match analysis
                    </p>
                    <h3 className="mt-1 font-serif text-xl font-bold tracking-[-0.02em] text-[var(--navy)]">
                        How your resume lines up
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--slate)]">
                        Your profile was compared against what this employer is
                        looking for. Review the breakdown below, then continue
                        to your application.
                    </p>
                </div>
            </div>

            <div>
                <div className="flex items-center gap-2">
                    <Target
                        size={15}
                        className="text-[var(--teal)]"
                        aria-hidden="true"
                    />
                    <h4 className="font-mono text-[10px] tracking-[0.1em] text-[var(--navy)] uppercase">
                        Match breakdown
                    </h4>
                </div>
                <div className="mt-4 grid gap-4">
                    {analysis.categories.map((category) => (
                        <div key={category.label}>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-medium text-[var(--ink)]">
                                    {category.label}
                                </span>
                                <span className="font-mono text-[10px] text-[var(--slate)]">
                                    {category.score}%
                                </span>
                            </div>
                            <div
                                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--line)]"
                                role="meter"
                                aria-valuenow={Math.round(category.score)}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={category.label}
                            >
                                <div
                                    className={cn(
                                        'h-full rounded-full transition-all duration-700 motion-reduce:transition-none',
                                        TONE_BAR[categoryTone(category.score)],
                                    )}
                                    style={{ width: `${category.score}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                    <div className="flex items-center gap-2">
                        <ThumbsUp
                            size={15}
                            className="text-[var(--teal)]"
                            aria-hidden="true"
                        />
                        <h4 className="font-mono text-[10px] tracking-[0.1em] text-[var(--navy)] uppercase">
                            Strengths
                        </h4>
                    </div>
                    <ul className="mt-3 grid gap-2">
                        {analysis.strengths.map((strength) => (
                            <li
                                key={strength}
                                className="flex items-start gap-2 text-xs leading-relaxed text-[var(--slate)]"
                            >
                                <CheckCircle2
                                    size={13}
                                    className="mt-0.5 shrink-0 text-[var(--teal)]"
                                    aria-hidden="true"
                                />
                                {strength}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                    <div className="flex items-center gap-2">
                        <Lightbulb
                            size={15}
                            className="text-[var(--amber)]"
                            aria-hidden="true"
                        />
                        <h4 className="font-mono text-[10px] tracking-[0.1em] text-[var(--navy)] uppercase">
                            Gaps to close
                        </h4>
                    </div>
                    <ul className="mt-3 grid gap-2">
                        {analysis.gaps.map((gap) => (
                            <li
                                key={gap}
                                className="flex items-start gap-2 text-xs leading-relaxed text-[var(--slate)]"
                            >
                                <AlertCircle
                                    size={13}
                                    className="mt-0.5 shrink-0 text-[var(--amber)]"
                                    aria-hidden="true"
                                />
                                {gap}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                <div className="flex items-center gap-2">
                    <Sparkles
                        size={15}
                        className="text-[var(--teal)]"
                        aria-hidden="true"
                    />
                    <h4 className="font-mono text-[10px] tracking-[0.1em] text-[var(--navy)] uppercase">
                        Before you submit
                    </h4>
                </div>
                <ul className="mt-3 grid gap-2">
                    {analysis.tips.map((tip) => (
                        <li
                            key={tip}
                            className="flex items-start gap-2 text-xs leading-relaxed text-[var(--slate)]"
                        >
                            <Target
                                size={13}
                                className="mt-0.5 shrink-0 text-[var(--teal)]"
                                aria-hidden="true"
                            />
                            {tip}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
