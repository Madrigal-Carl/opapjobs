import { Head } from '@inertiajs/react';
import { AgencyOverview } from '@/components/dashboard/agency-overview';
import { overview } from '@/routes/dashboard';

export default function DashboardOverviewSystem() {
    return (
        <>
            <Head title="System overview" />
            <AgencyOverview variant="system" />
        </>
    );
}

DashboardOverviewSystem.layout = {
    breadcrumbs: [
        {
            title: 'Overview',
            href: overview(),
        },
    ],
};
