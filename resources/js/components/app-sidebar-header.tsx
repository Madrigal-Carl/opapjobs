import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

/**
 * Dashboard top bar: 55px, white, hairline bottom border. Holds the
 * sidebar toggle and the current page name; no search or avatar.
 */
export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="flex h-[55px] shrink-0 items-center gap-3 border-b border-[var(--line)] bg-white px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[55px] md:px-8 [&_[data-slot=breadcrumb-page]]:text-[15px] [&_[data-slot=breadcrumb-page]]:font-medium [&_[data-slot=breadcrumb-page]]:text-[var(--navy)] [&_ol]:text-[15px]">
            <SidebarTrigger className="-ml-1 text-[var(--slate)]" />
            <Breadcrumbs breadcrumbs={breadcrumbs} />
        </header>
    );
}
