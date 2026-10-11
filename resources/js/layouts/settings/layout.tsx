import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: edit(),
        icon: null,
    },
    {
        title: 'Security',
        href: editSecurity(),
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
            <Heading
                title="Settings"
                description="Manage your profile and security settings"
            />

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
                <aside className="lg:w-56 lg:shrink-0">
                    <nav
                        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0"
                        aria-label="Settings"
                    >
                        {sidebarNavItems.map((item, index) => {
                            const isActive = isCurrentOrParentUrl(item.href);

                            return (
                                <Link
                                    key={`${toUrl(item.href)}-${index}`}
                                    href={item.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                        'inline-flex min-h-11 items-center rounded-md px-4 text-sm font-medium whitespace-nowrap transition',
                                        isActive
                                            ? 'bg-[var(--teal-light)] text-[var(--navy)]'
                                            : 'text-[var(--slate)] hover:bg-[var(--surface-soft)] hover:text-[var(--navy)]',
                                    )}
                                >
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                <Separator className="lg:hidden" />

                <div className="min-w-0 flex-1 space-y-8">{children}</div>
            </div>
        </div>
    );
}
