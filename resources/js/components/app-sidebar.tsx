import { Link, usePage } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    Globe,
    LayoutGrid,
    ShieldCheck,
    UserSearch,
    Users,
} from 'lucide-react';
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
            <SidebarHeader className="p-0">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="h-20 gap-3 rounded-none px-4 group-data-[collapsible=icon]:h-20! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:p-0! hover:bg-transparent hover:text-white data-[state=open]:bg-transparent"
                        >
                            <Link href={overview()} prefetch>
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--amber)]">
                                    <Globe
                                        className="size-[18px] text-[var(--navy-deep)]"
                                        strokeWidth={1.8}
                                        aria-hidden="true"
                                    />
                                </span>
                                <span className="truncate text-[18px] font-bold text-white group-data-[collapsible=icon]:hidden">
                                    OPAP Job Abroad
                                </span>
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
