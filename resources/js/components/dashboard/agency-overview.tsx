import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import {
    getOverviewDays,
    getOverviewSummary,
    getTopJobs,
} from '@/data/selectors';
import type { OverviewDayPoint } from '@/types/overview';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardPage } from '@/components/dashboard/page';

export type DashboardOverviewVariant = 'hiring' | 'platform' | 'system';

type OverviewCopy = {
    eyebrow: string;
    title: string;
    subtitle: string;
};

const overviewCopy: Record<DashboardOverviewVariant, OverviewCopy> = {
    hiring: {
        eyebrow: 'Performance / Reports',
        title: 'Agency overview',
        subtitle:
            'A clear view of your recruitment performance and hiring pipeline.',
    },
    platform: {
        eyebrow: 'Platform / Overview',
        title: 'Platform overview',
        subtitle:
            'Recruitment performance and the hiring pipeline across the platform.',
    },
    system: {
        eyebrow: 'System / Overview',
        title: 'System overview',
        subtitle:
            'Recruitment performance and the hiring pipeline across the system.',
    },
};

const STAGE_LABELS = ['Pending', 'Reviewed', 'Interviewed', 'Hired'] as const;

function formatShortDate(date: string): string {
    return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

function MetricCard({
    label,
    value,
    note,
    icon: Icon,
}: {
    label: string;
    value: string | number;
    note: ReactNode;
    icon: LucideIcon;
}) {
    return (
        <Card
            data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}
        >
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                />
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
                <span className="text-3xl font-bold tracking-tight tabular-nums">
                    {value}
                </span>
                <CardDescription>{note}</CardDescription>
            </CardContent>
        </Card>
    );
}

function TrendChart({ days }: { days: OverviewDayPoint[] }) {
    const width = 620;
    const height = 240;
    const left = 34;
    const right = 10;
    const top = 13;
    const bottom = 30;
    const max = Math.max(4, ...days.map((day) => day.applications));
    const innerW = width - left - right;
    const innerH = height - top - bottom;
    const coords = days.map((day, index) => ({
        x:
            left +
            (days.length <= 1
                ? innerW / 2
                : (index * innerW) / (days.length - 1)),
        y: top + innerH - (day.applications / max) * innerH,
    }));
    const line = coords
        .map(
            (point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`,
        )
        .join(' ');
    const fill = `${line} L${left + innerW},${top + innerH} L${left},${top + innerH} Z`;
    const labels =
        days.length > 14
            ? days.filter(
                  (_, index) =>
                      index % Math.ceil(days.length / 7) === 0 ||
                      index === days.length - 1,
              )
            : days;

    return (
        <svg
            className="w-full"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`Application trend showing ${days.reduce((sum, day) => sum + day.applications, 0)} applications across ${days.length} days`}
        >
            {[0, 1, 2, 3, 4].map((value) => {
                const y = top + innerH - (value * innerH) / 4;

                return (
                    <g key={value}>
                        <line
                            x1={left}
                            y1={y}
                            x2={width - right}
                            y2={y}
                            style={{ stroke: 'var(--line)' }}
                        />
                        <text
                            x={left - 9}
                            y={y + 3}
                            textAnchor="end"
                            style={{
                                fill: 'var(--slate)',
                                fontSize: 10,
                            }}
                        >
                            {Math.round((max * value) / 4)}
                        </text>
                    </g>
                );
            })}
            {days.length > 0 && (
                <>
                    <path
                        d={fill}
                        style={{ fill: 'var(--teal)', opacity: 0.12 }}
                    />
                    <path
                        d={line}
                        fill="none"
                        style={{
                            stroke: 'var(--teal)',
                            strokeWidth: 2,
                        }}
                    />
                    {coords.map((point, index) => (
                        <circle
                            key={index}
                            cx={point.x}
                            cy={point.y}
                            r={3}
                            style={{ fill: 'var(--teal)' }}
                        />
                    ))}
                </>
            )}
            {labels.map((day) => {
                const index = days.indexOf(day);
                const x =
                    left +
                    (days.length <= 1
                        ? innerW / 2
                        : (index * innerW) / (days.length - 1));

                return (
                    <text
                        key={day.date}
                        x={x}
                        y={height - 7}
                        textAnchor="middle"
                        style={{ fill: 'var(--slate)', fontSize: 10 }}
                    >
                        {formatShortDate(day.date)}
                    </text>
                );
            })}
        </svg>
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

function PanelRow({
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
        <div className="flex items-center justify-between gap-4 py-2.5">
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

export function AgencyOverview({
    variant,
}: {
    variant: DashboardOverviewVariant;
}) {
    const copy = overviewCopy[variant];
    const [startDraft, setStartDraft] = useState('2026-02-01');
    const [endDraft, setEndDraft] = useState('2026-02-28');
    const [start, setStart] = useState('2026-02-01');
    const [end, setEnd] = useState('2026-02-28');
    const [filterMessage, setFilterMessage] = useState('');

    const summary = getOverviewSummary();
    const days = getOverviewDays();

    const filteredDays = useMemo(
        () => days.filter((day) => day.date >= start && day.date <= end),
        [days, start, end],
    );

    const periodApplications = filteredDays.reduce(
        (sum, day) => sum + day.applications,
        0,
    );
    const conversionRate = summary.totalApplications
        ? Math.round(
              (summary.stageCounts.Hired / summary.totalApplications) * 100,
          )
        : 0;
    const topJobs = getTopJobs(3);

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
            ['Total jobs', String(summary.totalJobs)],
            ['Featured jobs', String(summary.featuredJobs)],
            ['Applications', String(summary.totalApplications)],
            ['Hired', String(summary.stageCounts.Hired)],
            ['Pending', String(summary.stageCounts.Pending)],
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

    const exportPdf = () => {
        window.print();
    };

    return (
        <DashboardPage>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wider text-[var(--teal)] uppercase">
                        {copy.eyebrow}
                    </p>
                    <h1 className="font-serif text-2xl font-bold tracking-[-0.02em] text-[var(--navy)] sm:text-3xl">
                        {copy.title}
                    </h1>
                    <p className="mt-1 text-sm text-[var(--slate)]">
                        {copy.subtitle}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={exportCsv}
                        data-testid="button-export-csv"
                    >
                        <ArrowDownToLine aria-hidden="true" />
                        Export CSV
                    </Button>
                    <Button onClick={exportPdf} data-testid="button-export-pdf">
                        <FileText aria-hidden="true" />
                        Export PDF
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="flex flex-wrap items-end gap-4 pt-6">
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
                </CardContent>
            </Card>

            <section
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                aria-label="Recruitment performance totals"
                data-testid="report-metrics"
            >
                <MetricCard
                    label="Total jobs"
                    value={summary.totalJobs}
                    note={
                        <>
                            <span className="text-[var(--teal)]">
                                {summary.featuredJobs} featured
                            </span>{' '}
                            listings
                        </>
                    }
                    icon={BriefcaseBusiness}
                />
                <MetricCard
                    label="Applications"
                    value={summary.totalApplications}
                    note={
                        periodApplications
                            ? `${periodApplications} in the selected period`
                            : 'No applications in this period'
                    }
                    icon={Users}
                />
                <MetricCard
                    label="Hired"
                    value={summary.stageCounts.Hired}
                    note={
                        summary.totalApplications
                            ? `${conversionRate}% conversion rate`
                            : 'No hires yet'
                    }
                    icon={UserRoundCheck}
                />
                <MetricCard
                    label="Pending"
                    value={summary.stageCounts.Pending}
                    note={`${summary.stageCounts.Interviewed} interviews scheduled`}
                    icon={Clock3}
                />
            </section>

            <div className="grid gap-4 xl:grid-cols-5">
                <Card
                    className="xl:col-span-3"
                    data-testid="panel-application-trends"
                >
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <div>
                            <CardTitle>Application trends</CardTitle>
                            <CardDescription>
                                Applications received within the selected period
                            </CardDescription>
                        </div>
                        <span className="flex items-center gap-1.5 text-xs text-[var(--slate)]">
                            <span
                                className="size-2 rounded-full"
                                style={{ background: 'var(--teal)' }}
                                aria-hidden="true"
                            />
                            Applications
                        </span>
                    </CardHeader>
                    <CardContent>
                        {filteredDays.length ? (
                            <TrendChart days={filteredDays} />
                        ) : (
                            <div
                                className="flex flex-col items-center gap-2 py-10 text-center"
                                data-testid="empty-report-trend"
                            >
                                <Activity
                                    className="size-6 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <p className="text-sm text-[var(--slate)]">
                                    No application activity for these dates. Try
                                    a wider reporting period.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card
                    className="xl:col-span-2"
                    data-testid="panel-hiring-funnel"
                >
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <div>
                            <CardTitle>Hiring funnel</CardTitle>
                            <CardDescription>
                                Applicant progress by stage
                            </CardDescription>
                        </div>
                        <ListFilter
                            className="size-4 text-muted-foreground"
                            aria-hidden="true"
                        />
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        {summary.totalApplications ? (
                            STAGE_LABELS.map((stage) => (
                                <FunnelRow
                                    key={stage}
                                    label={stage}
                                    value={summary.stageCounts[stage]}
                                    max={summary.totalApplications}
                                />
                            ))
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-6 text-center">
                                <Users
                                    className="size-6 text-muted-foreground"
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
                                {summary.totalApplications
                                    ? `${(
                                          (summary.stageCounts.Hired /
                                              summary.totalApplications) *
                                          100
                                      ).toFixed(1)}%`
                                    : '—'}
                            </strong>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <div>
                            <CardTitle>Current hiring stages</CardTitle>
                            <CardDescription>
                                Active pipeline across your team
                            </CardDescription>
                        </div>
                        <BadgeLive />
                    </CardHeader>
                    <CardContent>
                        <PanelRow
                            index={0}
                            label="Application review"
                            value={
                                summary.stageCounts.Reviewed +
                                summary.stageCounts.Pending
                            }
                            suffix="applicants"
                        />
                        <PanelRow
                            index={1}
                            label="Interview scheduled"
                            value={summary.stageCounts.Interviewed}
                            suffix="applicants"
                        />
                        <PanelRow
                            index={2}
                            label="Successful placement"
                            value={summary.stageCounts.Hired}
                            suffix="applicants"
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <div>
                            <CardTitle>Hiring snapshot</CardTitle>
                            <CardDescription>
                                Jobs receiving the most interest
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {topJobs.map((row, index) => (
                            <PanelRow
                                key={row.job.id}
                                index={index}
                                label={row.job.title}
                                value={row.applicants}
                                suffix={
                                    row.applicants === 1
                                        ? 'applicant'
                                        : 'applicants'
                                }
                            />
                        ))}
                    </CardContent>
                </Card>
            </div>
        </DashboardPage>
    );
}

function BadgeLive() {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-0.5 text-xs font-medium text-[var(--navy)]">
            <span
                className="size-1.5 rounded-full bg-[var(--teal)]"
                aria-hidden="true"
            />
            Live snapshot
        </span>
    );
}
