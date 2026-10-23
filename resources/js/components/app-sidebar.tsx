import { Link, usePage } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    Building2,
    ClipboardList,
    FileCog,
    FileText,
    Globe,
    History,
    LayoutGrid,
    MessageSquareText,
    ShieldCheck,
    UserRound,
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
import * as system from '@/routes/dashboard/system';
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

/**
 * Super Admin console. Every item is gated on the one superadmin-only
 * capability (docs §2.3); the server-side `can:` middleware is the real
 * gate and this filter is only cosmetic, exactly like the items above.
 *
 * Grouped with Space Mono labels so the three concerns stay separate:
 * records to manage, knobs to configure, and things to keep an eye on.
 */
const systemNavItems: NavItem[] = [
    // Manage
    {
        title: 'Agencies',
        href: system.agencies(),
        icon: Building2,
        group: 'Manage',
        permissions: ['view system overview'],
    },
    {
        title: 'Accounts',
        href: system.accounts(),
        icon: ShieldCheck,
        group: 'Manage',
        permissions: ['view system overview'],
    },
    {
        title: 'Job posts',
        href: system.jobPosts(),
        icon: BriefcaseBusiness,
        group: 'Manage',
        permissions: ['view system overview'],
    },
    {
        title: 'Applications',
        href: system.applications(),
        icon: ClipboardList,
        group: 'Manage',
        permissions: ['view system overview'],
    },
    {
        title: 'Applicants',
        href: system.applicants(),
        icon: UserRound,
        group: 'Manage',
        permissions: ['view system overview'],
    },
    {
        title: 'Reviews',
        href: system.reviews(),
        icon: MessageSquareText,
        group: 'Manage',
        permissions: ['view system overview'],
    },

    // Configure
    {
        title: 'Categories',
        href: system.categories(),
        icon: ClipboardList,
        group: 'Configure',
        permissions: ['view system overview'],
    },
    {
        title: 'Fields and options',
        href: system.fields(),
        icon: FileCog,
        group: 'Configure',
        permissions: ['view system overview'],
    },
    {
        title: 'Site content',
        href: system.content(),
        icon: FileText,
        group: 'Configure',
        permissions: ['view system overview'],
    },

    // Monitor
    {
        title: 'Audit log',
        href: system.auditLog(),
        icon: History,
        group: 'Monitor',
        permissions: ['view system overview'],
    },
    // No Settings item: the console has no Settings screen of its own.
    // Account-level settings live with the signed-in user, so a console
    // link would only ever be a dead one.
];

export function AppSidebar() {
    const { permissions } = usePage().props.auth;

    // Cosmetic filter only: the server-side can: middleware is the
    // real gate. An item is visible when the user has any of its
    // required permissions.
    const matchesPermission = (item: NavItem) =>
        item.permissions === undefined ||
        item.permissions.some((permission) => permissions.includes(permission));

    // The whole Platform list (Overview, Jobs, Applications, Candidates,
    // Accounts) is the agency admin's own navigation. A superadmin works
    // only from the console groups below, so none of it is shown to them —
    // that is also what stops Accounts and Applications showing up twice.
    //
    // "view system overview" doubles as the console signal: a superadmin
    // has no overview page to go home to.
    const isConsoleUser = permissions.includes('view system overview');
    const mainNavItems = isConsoleUser
        ? []
        : allNavItems.filter(matchesPermission);
    const consoleNavItems = systemNavItems.filter(matchesPermission);

    // Shared by both brand states below so the mark never drifts apart.
    const brand = (
        <>
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
        </>
    );

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="p-0">
                <SidebarMenu>
                    <SidebarMenuItem>
                        {/* A superadmin has no Overview page (it was removed
                            from the console), so a link here would be an
                            unlabeled dead control taking them somewhere they
                            cannot use. The brand stays visible as a static
                            mark; every other role keeps the working link. */}
                        {isConsoleUser ? (
                            <div className="flex h-20 items-center gap-3 px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                                {brand}
                            </div>
                        ) : (
                            <SidebarMenuButton
                                size="lg"
                                asChild
                                className="h-20 gap-3 rounded-none px-4 group-data-[collapsible=icon]:h-20! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:p-0! hover:bg-transparent hover:text-white data-[state=open]:bg-transparent"
                            >
                                <Link href={overview()} prefetch>
                                    {brand}
                                </Link>
                            </SidebarMenuButton>
                        )}
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {/* One NavMain for every item so the hairline dividers fall
                    between *all* groups — splitting them into two calls left
                    "Manage" without the divider its siblings get. With no
                    console items the array is just the original list, so
                    existing navigation is byte-identical. */}
                <NavMain items={[...mainNavItems, ...consoleNavItems]} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
