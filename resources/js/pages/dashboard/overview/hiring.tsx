import { Head } from '@inertiajs/react';
import { AgencyOverview } from '@/components/dashboard/agency-overview';
import { overview } from '@/routes/dashboard';

export default function DashboardOverviewHiring() {
    return (
        <>
            <Head title="Overview" />
            <AgencyOverview variant="hiring" />
        </>
    );
}

DashboardOverviewHiring.layout = {
    breadcrumbs: [
        {
            title: 'Overview',
            href: overview(),
        },
    ],
};
