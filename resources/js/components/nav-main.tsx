import { Fragment } from 'react';
import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

/**
 * Nav item look: muted white when idle, a subtle white wash on hover and
 * a filled navy panel with an amber icon on the current route. The state
 * is driven by `data-[active=true]` / `aria-current="page"` so it is pure
 * CSS, and it also applies in the collapsed icon-only sidebar.
 */
const navItemClasses =
    'h-[42px] gap-3 rounded-[10px] px-4 text-[15px] font-medium text-white/60 transition-colors duration-150 motion-reduce:transition-none hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--amber)] focus-visible:outline-none data-[active=true]:border data-[active=true]:border-[var(--sidebar-active-border)] data-[active=true]:bg-[var(--sidebar-active)] data-[active=true]:font-semibold data-[active=true]:text-white data-[active=true]:[&_svg]:text-[var(--amber)] group-data-[collapsible=icon]:h-10! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:p-0! [&_svg]:size-[18px]';

/**
 * Group label for the sidebar sections. Space Mono uppercase, matching the
 * existing "Platform" eyebrow. Hidden when the rail is collapsed to icons;
 * each item carries a tooltip so the icon-only state stays labelled.
 */
const groupLabelClasses =
    'h-7 pl-4 font-mono text-[11px] font-bold tracking-[0.08em] text-white/55 uppercase group-data-[collapsible=icon]:hidden';

type NavGroup = {
    label: string;
    items: NavItem[];
};

/**
 * Buckets items by `group`, preserving first-seen order. Items without a
 * group land under the default label so existing navigation is unchanged.
 */
function groupItems(items: NavItem[]): NavGroup[] {
    const groups: NavGroup[] = [];
    const indexByLabel = new Map<string, NavGroup>();

    for (const item of items) {
        const label = item.group ?? 'Platform';
        let group = indexByLabel.get(label);

        if (!group) {
            group = { label, items: [] };
            indexByLabel.set(label, group);
            groups.push(group);
        }

        group.items.push(item);
    }

    return groups;
}

function NavItemRow({ item }: { item: NavItem }) {
    const { isCurrentUrl } = useCurrentUrl();

    // Prefix matching keeps /dashboard/jobs/new on "Jobs"
    // without bleeding into sibling sections.
    const isActive = isCurrentUrl(item.href, undefined, true);

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={isActive}
                aria-current={isActive ? 'page' : undefined}
                className={navItemClasses}
                tooltip={{ children: item.title }}
            >
                <Link href={item.href} prefetch>
                    {item.icon && <item.icon />}
                    <span className="group-data-[collapsible=icon]:hidden">
                        {item.title}
                    </span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

function NavGroupSection({ label, items }: NavGroup) {
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className={groupLabelClasses}>
                {label}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1.5">
                {items.map((item) => (
                    <NavItemRow key={item.title} item={item} />
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}

export function NavMain({ items }: { items: NavItem[] }) {
    const groups = groupItems(items);

    return (
        <>
            {groups.map((group, index) => (
                <Fragment key={group.label}>
                    {index > 0 && (
                        <div
                            aria-hidden="true"
                            className="mx-4 mt-4 border-t border-white/10"
                        />
                    )}
                    <NavGroupSection label={group.label} items={group.items} />
                </Fragment>
            ))}
        </>
    );
}
