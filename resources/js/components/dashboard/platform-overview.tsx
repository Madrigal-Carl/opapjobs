import {
    Activity,
    ArrowDownToLine,
    BriefcaseBusiness,
    Clock3,
    FileText,
    Filter,
    ListFilter,
    UserRoundCheck,
    Users,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
import { KpiCard, KpiGrid } from '@/components/dashboard/kpi-card';
import { DashboardPage } from '@/components/dashboard/page';
import { PageHeader } from '@/components/dashboard/page-header';
import {
    TrendChart,
    formatShortDate,
} from '@/components/dashboard/overview-trend-chart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OverviewDayPoint, PlatformOverviewData } from '@/types/overview';

const STAGE_LABELS = ['Pending', 'Reviewed', 'Interviewed', 'Hired'] as const;

/** `YYYY-MM-DD` in local time, matching the server's `DATE()` output. */
function toKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}

function parseKey(key: string): Date | null {
    const date = new Date(`${key}T12:00:00`);

    return Number.isNaN(date.getTime()) ? null : date;
}

/** Falls back to the last 30 days when nothing has been submitted yet. */
function fallbackRange(): { start: string; end: string } {
    const end = new Date();
    const start = new Date(end);

    start.setDate(start.getDate() - 29);

    return { start: toKey(start), end: toKey(end) };
}

/**
 * The server sends only the days that actually had activity, so without
 * this the line would jump straight from the first point to the last and
 * imply traffic across a silent gap. Filling the selected range with
 * explicit zeros keeps the x-axis honest for whatever window is picked.
 */
function fillDailySeries(
    days: OverviewDayPoint[],
    start: string,
    end: string,
): OverviewDayPoint[] {
    const from = parseKey(start);
    const to = parseKey(end);

    if (!from || !to || from > to) {
        return days;
    }

    const byDate = new Map(days.map((day) => [day.date, day]));
    const filled: OverviewDayPoint[] = [];

    // Hard cap: a mistyped or far-future range must not spin the loop,
    // and a year of daily points already outlasts the axis labels.
    for (let index = 0; index < 400 && from <= to; index += 1) {
        const key = toKey(from);

        filled.push(
            byDate.get(key) ?? {
                date: key,
                applications: 0,
                reviewed: 0,
                interview: 0,
                hired: 0,
            },
        );

        from.setDate(from.getDate() + 1);
    }

    return filled;
}

/** Raised white card with a divider header — the console's panel language. */
function Panel({
    title,
    subtitle,
    action,
    testId,
    children,
}: {
    title: string;
    subtitle: string;
    action?: ReactNode;
    testId?: string;
    children: ReactNode;
}) {
    return (
        <section
            className="overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-xs"
            data-testid={testId}
        >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
                <div className="min-w-0">
                    <h2 className="font-serif text-lg font-bold tracking-[-0.02em] text-[var(--navy)]">
                        {title}
                    </h2>
                    <p className="text-xs text-[var(--slate)]">{subtitle}</p>
                </div>
                {action}
            </header>
            <div className="p-4">{children}</div>
        </section>
    );
}

function FunnelRow({
    label,
    value,
    max,
}: {
    label: string;
    value: number;
    max: number;
}) {
    return (
        <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm text-[var(--slate)]">
                {label}
            </span>
            <div
                className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-soft)]"
                role="presentation"
            >
                <div
                    className="h-full rounded-full bg-[var(--teal)]"
                    style={{
                        width: `${max > 0 ? Math.max(7, (value / max) * 100) : 0}%`,
                    }}
                />
            </div>
            <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">
                {value}
            </span>
        </div>
    );
}

function StageRow({
    index,
    label,
    value,
    suffix,
}: {
    index: number;
    label: string;
    value: number;
    suffix: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] py-2.5 last:border-b-0">
            <span className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-[var(--teal)]">
                    {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-sm font-medium text-[var(--navy)]">
                    {label}
                </span>
            </span>
            <span className="text-sm text-[var(--slate)] tabular-nums">
                {value} {suffix}
            </span>
        </div>
    );
}

/**
 * The admin's Platform overview, driven entirely by database rows.
 *
 * Deliberately a separate component from `AgencyOverview`: that one still
 * serves the hiring and system overviews from reference data, and keeping
 * them apart means this page can be restyled and re-scoped without either
 * of the other two roles seeing a single pixel change.
 */
export function PlatformOverview({ data }: { data: PlatformOverviewData }) {
    const { summary, days, top_jobs: topJobs, range } = data;
    const defaultRange = range ?? fallbackRange();

    const [startDraft, setStartDraft] = useState(defaultRange.start);
    const [endDraft, setEndDraft] = useState(defaultRange.end);
    const [start, setStart] = useState(defaultRange.start);
    const [end, setEnd] = useState(defaultRange.end);
    const [filterMessage, setFilterMessage] = useState('');

    const filteredDays = useMemo(
        () => fillDailySeries(days, start, end),
        [days, start, end],
    );

    const periodApplications = filteredDays.reduce(
        (sum, day) => sum + day.applications,
        0,
    );

    const applyFilter = () => {
        if (!startDraft || !endDraft || startDraft > endDraft) {
            toast.error('Choose a valid start and end date.');
            return;
        }

        setStart(startDraft);
        setEnd(endDraft);
        setFilterMessage(
            `Showing report data from ${formatShortDate(startDraft)} to ${formatShortDate(endDraft)}.`,
        );
    };

    const exportCsv = () => {
        const rows = [
            ['OPAP Jobs overview', `${start} to ${end}`],
            ['Metric', 'Value'],
            ['Job posts', String(summary.total_jobs)],
            ['Active job posts', String(summary.active_jobs)],
            ['Applications', String(summary.total_applications)],
            ['Hired', String(summary.stage_counts.Hired)],
            ['Pending', String(summary.stage_counts.Pending)],
            [],
            ['Date', 'Applications', 'Reviewed', 'Interview', 'Hired'],
            ...filteredDays.map((day) => [
                day.date,
                String(day.applications),
                String(day.reviewed),
                String(day.interview),
                String(day.hired),
            ]),
        ];
        const csv = rows
            .map((row) =>
                row
                    .map(
                        (cell) =>
                            `"${String(cell ?? '').replaceAll('"', '""')}"`,
                    )
                    .join(','),
            )
            .join('\r\n');
        const url = URL.createObjectURL(
            new Blob([csv], { type: 'text/csv;charset=utf-8' }),
        );
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = `opapjobs-overview-${start}-to-${end}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);

        toast.success('Report exported.');
    };

    return (
        <DashboardPage className="md:px-8">
            <div className="flex flex-col gap-6">
                <PageHeader
                    title="Platform overview"
                    subtitle="Recruitment performance and the hiring pipeline for your agency."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="secondary"
                                onClick={exportCsv}
                                data-testid="button-export-csv"
                            >
                                <ArrowDownToLine aria-hidden="true" />
                                Export CSV
                            </Button>
                            <Button
                                onClick={() => window.print()}
                                data-testid="button-export-pdf"
                            >
                                <FileText aria-hidden="true" />
                                Export PDF
                            </Button>
                        </div>
                    }
                />

                <div className="flex flex-wrap items-end gap-4 rounded-lg border border-[var(--line)] bg-white px-4 py-3 shadow-xs">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="report-start">Start date</Label>
                        <Input
                            id="report-start"
                            type="date"
                            value={startDraft}
                            onChange={(event) =>
                                setStartDraft(event.target.value)
                            }
                            data-testid="input-report-start"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="report-end">End date</Label>
                        <Input
                            id="report-end"
                            type="date"
                            value={endDraft}
                            onChange={(event) =>
                                setEndDraft(event.target.value)
                            }
                            data-testid="input-report-end"
                        />
                    </div>
                    <Button
                        onClick={applyFilter}
                        data-testid="button-apply-filter"
                    >
                        <Filter aria-hidden="true" />
                        Apply filter
                    </Button>
                    {filterMessage && (
                        <span
                            className="pb-2 text-sm text-[var(--slate)]"
                            role="status"
                            data-testid="status-report-filter"
                        >
                            {filterMessage}
                        </span>
                    )}
                </div>

                <KpiGrid>
                    <KpiCard
                        label="Job Posts"
                        value={summary.total_jobs}
                        caption={`${summary.active_jobs} active now`}
                        icon={BriefcaseBusiness}
                        tone="blue"
                        data-testid="metric-job-posts"
                    />
                    <KpiCard
                        label="Total Applications"
                        value={summary.total_applications}
                        caption={
                            periodApplications
                                ? `${periodApplications} in the selected period`
                                : 'No applications in this period'
                        }
                        icon={Users}
                        tone="violet"
                        data-testid="metric-applications"
                    />
                    <KpiCard
                        label="Hired"
                        value={summary.stage_counts.Hired}
                        caption={
                            summary.total_applications
                                ? `${summary.conversion_rate}% conversion rate`
                                : 'No hires yet'
                        }
                        icon={UserRoundCheck}
                        tone="emerald"
                        data-testid="metric-hired"
                    />
                    <KpiCard
                        label="Pending"
                        value={summary.stage_counts.Pending}
                        caption={`${summary.stage_counts.Interviewed} interviews scheduled`}
                        icon={Clock3}
                        tone="orange"
                        data-testid="metric-pending"
                    />
                </KpiGrid>

                <div className="grid gap-4 xl:grid-cols-5">
                    <div className="xl:col-span-3">
                        <Panel
                            title="Application trends"
                            subtitle="Applications received within the selected period"
                            testId="panel-application-trends"
                            action={
                                <span className="flex items-center gap-1.5 text-xs text-[var(--slate)]">
                                    <span
                                        className="size-2 rounded-full"
                                        style={{ background: 'var(--teal)' }}
                                        aria-hidden="true"
                                    />
                                    Applications
                                </span>
                            }
                        >
                            {filteredDays.length ? (
                                <TrendChart days={filteredDays} />
                            ) : (
                                <div
                                    className="flex flex-col items-center gap-2 py-10 text-center"
                                    data-testid="empty-report-trend"
                                >
                                    <Activity
                                        className="size-6 text-[var(--slate)]"
                                        aria-hidden="true"
                                    />
                                    <p className="text-sm text-[var(--slate)]">
                                        No application activity for these dates.
                                        Try a wider reporting period.
                                    </p>
                                </div>
                            )}
                        </Panel>
                    </div>

                    <div className="xl:col-span-2">
                        <Panel
                            title="Hiring funnel"
                            subtitle="Applicant progress by stage"
                            testId="panel-hiring-funnel"
                            action={
                                <ListFilter
                                    className="size-4 text-[var(--slate)]"
                                    aria-hidden="true"
                                />
                            }
                        >
                            <div className="flex flex-col gap-3">
                                {summary.total_applications ? (
                                    STAGE_LABELS.map((stage) => (
                                        <FunnelRow
                                            key={stage}
                                            label={stage}
                                            value={summary.stage_counts[stage]}
                                            max={summary.total_applications}
                                        />
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                                        <Users
                                            className="size-6 text-[var(--slate)]"
                                            aria-hidden="true"
                                        />
                                        <p className="text-sm text-[var(--slate)]">
                                            There are no applicants yet.
                                        </p>
                                    </div>
                                )}
                                <div className="mt-2 flex items-center justify-between border-t border-[var(--line)] pt-3">
                                    <span className="text-sm text-[var(--slate)]">
                                        Application to hire
                                    </span>
                                    <strong className="tabular-nums">
                                        {summary.total_applications
                                            ? `${summary.conversion_rate}%`
                                            : '—'}
                                    </strong>
                                </div>
                            </div>
                        </Panel>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Panel
                        title="Current hiring stages"
                        subtitle="Active pipeline across your agency"
                    >
                        <StageRow
                            index={0}
                            label="Application review"
                            value={
                                summary.stage_counts.Reviewed +
                                summary.stage_counts.Pending
                            }
                            suffix="applicants"
                        />
                        <StageRow
                            index={1}
                            label="Interview scheduled"
                            value={summary.stage_counts.Interviewed}
                            suffix="applicants"
                        />
                        <StageRow
                            index={2}
                            label="Successful placement"
                            value={summary.stage_counts.Hired}
                            suffix="applicants"
                        />
                    </Panel>

                    <Panel
                        title="Hiring snapshot"
                        subtitle="Job posts receiving the most interest"
                    >
                        {topJobs.length ? (
                            topJobs.map((job, index) => (
                                <StageRow
                                    key={job.id}
                                    index={index}
                                    label={job.title}
                                    value={job.applicants}
                                    suffix={
                                        job.applicants === 1
                                            ? 'applicant'
                                            : 'applicants'
                                    }
                                />
                            ))
                        ) : (
                            <DashboardEmptyState
                                icon={BriefcaseBusiness}
                                title="No applications yet"
                                message="Job posts that receive applications will be ranked here."
                            />
                        )}
                    </Panel>
                </div>
            </div>
        </DashboardPage>
    );
}
