import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    /** Show the item when the user has any of these permissions. */
    permissions?: string[];
    /**
     * Sidebar section this item sits under, e.g. "Manage". Items sharing a
     * group render under one Space Mono label; ungrouped items keep the
     * default "Platform" label so the existing nav is unchanged.
     */
    group?: string;
};
