import { Head } from '@inertiajs/react';
import { PlatformOverview } from '@/components/dashboard/platform-overview';
import { overview } from '@/routes/dashboard';
import type { PlatformOverviewData } from '@/types/overview';

/**
 * The admin's overview. Unlike the hiring and system variants it is fed
 * real rows by `OverviewController`, so the props are part of the
 * contract rather than optional decoration.
 */
export default function DashboardOverviewPlatform({
    platformOverview,
}: {
    platformOverview: PlatformOverviewData;
}) {
    return (
        <>
            <Head title="Platform overview" />
            <PlatformOverview data={platformOverview} />
        </>
    );
}

DashboardOverviewPlatform.layout = {
    breadcrumbs: [
        {
            title: 'Overview',
            href: overview(),
        },
    ],
};
