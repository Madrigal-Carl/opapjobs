import { Link, usePage } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    LayoutGrid,
    ShieldCheck,
    UserSearch,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
    accounts,
    applications,
    candidates,
    jobs,
    overview,
} from '@/routes/dashboard';
import type { NavItem } from '@/types';

const allNavItems: NavItem[] = [
    {
        title: 'Overview',
        href: overview(),
        icon: LayoutGrid,
        permissions: [
            'view hiring overview',
            'view platform overview',
            'view system overview',
        ],
    },
    {
        title: 'Jobs',
        href: jobs(),
        icon: BriefcaseBusiness,
        permissions: ['view jobs'],
    },
    {
        title: 'Applications',
        href: applications(),
        icon: Users,
        permissions: ['view applications'],
    },
    {
        title: 'Candidates',
        href: candidates(),
        icon: UserSearch,
        permissions: ['view candidates'],
    },
    {
        title: 'Accounts',
        href: accounts(),
        icon: ShieldCheck,
        permissions: ['view accounts'],
    },
];

export function AppSidebar() {
    const { permissions } = usePage().props.auth;

    // Cosmetic filter only: the server-side can: middleware is the
    // real gate. An item is visible when the user has any of its
    // required permissions.
    const mainNavItems = allNavItems.filter(
        (item) =>
            item.permissions === undefined ||
            item.permissions.some((permission) =>
                permissions.includes(permission),
            ),
    );

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={overview()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
