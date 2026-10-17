import { usePage } from '@inertiajs/react';
import { ChevronsUpDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { UserMenuContent } from '@/components/user-menu-content';
import { useIsMobile } from '@/hooks/use-mobile';
import type { User } from '@/types';

const ROLE_LABELS: Record<string, string> = {
    employer: 'Employers',
    admin: 'Admins',
    superadmin: 'Superadmin',
    applicant: 'Applicants',
};

function roleLabelFor(user: User, roles: string[]): string {
    const role = roles[0];

    return (role && ROLE_LABELS[role]) || user.name;
}

export function NavUser() {
    const { auth } = usePage().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    if (!auth.user) {
        return null;
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="h-[52px] gap-3 rounded-xl bg-white/[0.06] px-3 text-white group-data-[collapsible=icon]:h-[52px]! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:p-0! hover:bg-white/[0.1] hover:text-white data-[state=open]:bg-white/[0.1]"
                            data-test="sidebar-menu-button"
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--amber)] text-sm font-bold text-[var(--navy-deep)]">
                                {auth.user.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="grid flex-1 text-left text-[15px] leading-tight font-medium group-data-[collapsible=icon]:hidden">
                                <span className="truncate">
                                    {roleLabelFor(auth.user, auth.roles)}
                                </span>
                            </span>
                            <ChevronsUpDown className="ml-auto size-4 text-white/60 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="end"
                        side={
                            isMobile
                                ? 'bottom'
                                : state === 'collapsed'
                                  ? 'left'
                                  : 'bottom'
                        }
                    >
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
