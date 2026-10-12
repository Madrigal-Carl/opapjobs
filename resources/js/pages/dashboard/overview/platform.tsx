import { Head } from '@inertiajs/react';
import { AgencyOverview } from '@/components/dashboard/agency-overview';
import { overview } from '@/routes/dashboard';

export default function DashboardOverviewPlatform() {
    return (
        <>
            <Head title="Platform overview" />
            <AgencyOverview variant="platform" />
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
