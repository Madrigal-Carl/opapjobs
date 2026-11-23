import type { ApexOptions } from 'apexcharts';
import ApexCharts from 'apexcharts';
import { formatShortDate } from '@/components/dashboard/overview-trend-chart';
import type { OverviewDayPoint } from '@/types/overview';

const CHART_HEIGHT = 240;

/**
 * Grouped bar chart behind the overview panels. ApexCharts draws its own
 * axes, legend and tooltip; the colours and text come from the dashboard's
 * CSS tokens so the chart keeps the panel styling instead of shipping a
 * second visual language.
 */
function buildOptions(
    days: OverviewDayPoint[],
    reducedMotion: boolean,
): ApexOptions {
    return {
        chart: {
            type: 'bar',
            height: CHART_HEIGHT,
            fontFamily: 'inherit',
            background: 'transparent',
            toolbar: { show: false },
            zoom: { enabled: false },
            animations: { enabled: !reducedMotion, speed: 320 },
            parentHeightOffset: 0,
        },
        colors: ['var(--teal)', 'var(--teal-ink)'],
        plotOptions: {
            bar: {
                columnWidth: '90%',
                borderRadius: 4,
                borderRadiusApplication: 'end',
            },
        },
        dataLabels: { enabled: false },
        stroke: { show: false, width: 0 },
        grid: {
            borderColor: 'var(--line)',
            strokeDashArray: 4,
            padding: { top: 8, right: 8, bottom: 0, left: 8 },
        },
        xaxis: {
            categories: days.map((day) => formatShortDate(day.date)),
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                rotate: 0,
                hideOverlappingLabels: true,
                style: { colors: 'var(--slate)', fontSize: '11px' },
            },
            tooltip: { enabled: false },
        },
        yaxis: {
            min: 0,
            forceNiceScale: true,
            labels: {
                style: { colors: 'var(--slate)', fontSize: '11px' },
            },
        },
        legend: {
            show: true,
            position: 'top',
            horizontalAlign: 'right',
            fontSize: '12px',
            labels: { colors: 'var(--slate)' },
            markers: { size: 5, shape: 'circle', strokeWidth: 0 },
            itemMargin: { horizontal: 10, vertical: 0 },
        },
        tooltip: {
            theme: 'light',
            style: { fontSize: '12px', fontFamily: 'inherit' },
        },
        series: [
            { name: 'Applications', data: days.map((day) => day.applications) },
            { name: 'Hired', data: days.map((day) => day.hired) },
        ],
    };
}

/**
 * Mounts the chart into a container the caller owns and hands back its
 * teardown. Creating the instance here keeps the module out of the server
 * bundle and gives the caller exact control over the chart's lifetime.
 */
export function createApplicationBarChart(
    element: HTMLElement,
    days: OverviewDayPoint[],
): { destroy: () => void } {
    const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
    ).matches;

    // A previous instance may have left its canvas behind during a
    // StrictMode double mount or a hot reload, so start from a clean host.
    element.replaceChildren();

    const chart = new ApexCharts(element, buildOptions(days, reducedMotion));

    void chart.render();

    return {
        destroy: () => {
            chart.destroy();
            element.replaceChildren();
        },
    };
}
