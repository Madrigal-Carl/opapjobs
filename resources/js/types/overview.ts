import type { ApplicationStage } from '@/types/application';

/**
 * One day of the trend series. The mock overview and the database-backed
 * platform overview both use this shape, so the chart and the CSV export
 * do not care which one fed them.
 */
export type OverviewDayPoint = {
    date: string;
    applications: number;
    reviewed: number;
    interview: number;
    hired: number;
};

/**
 * Totals the platform overview reads from the database. Scoped to the
 * admin's own Agency, so they always agree with the Jobs and
 * Applications screens behind them.
 */
export type PlatformOverviewSummary = {
    total_jobs: number;
    active_jobs: number;
    total_applications: number;
    stage_counts: Record<ApplicationStage, number>;
    conversion_rate: number;
};

export type PlatformOverviewTopJob = {
    id: number;
    title: string;
    applicants: number;
};

/**
 * Sent by `OverviewController` as `platformOverview`. `range` is the span
 * the reporting period defaults to — derived from the data so the chart
 * is never blank on first load — and is `null` when nothing has been
 * submitted yet.
 */
export type PlatformOverviewData = {
    summary: PlatformOverviewSummary;
    days: OverviewDayPoint[];
    top_jobs: PlatformOverviewTopJob[];
    range: { start: string; end: string } | null;
};
