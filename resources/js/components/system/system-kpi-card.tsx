import {
    KpiCard as BaseKpiCard,
    KpiGrid,
    type KpiCardProps,
} from '@/components/dashboard/kpi-card';

export type { KpiCardProps };
export { KpiGrid };

/**
 * Console wrapper around the shared `KpiCard`.
 *
 * It exists to flip every console tile to the `panel` variant — a tinted
 * icon chip and a slightly stronger shadow — from a single import line per
 * page, instead of threading `variant="panel"` through every call site.
 * The shared component keeps its `flat` default, so the agency dashboard's
 * tiles are untouched.
 */
export function KpiCard(props: Omit<KpiCardProps, 'variant'>) {
    return <BaseKpiCard {...props} variant="panel" />;
}
