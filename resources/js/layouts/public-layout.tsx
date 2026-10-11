import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';

type PublicLayoutProps = {
    children: ReactNode;
    /** Extra classes on the page wrapper (e.g. `agencies-page`). */
    className?: string;
    /** Set false on pages that omit the marketing footer, like agency profiles. */
    footer?: boolean;
};

/**
 * Chrome shared by every public marketing page: fixed header, page content,
 * footer. The `opap-page` wrapper carries the OPAP page background and the
 * `#top` anchor the header links back to.
 */
export default function PublicLayout({
    children,
    className,
    footer = true,
}: PublicLayoutProps) {
    return (
        <main
            className={className ? `opap-page ${className}` : 'opap-page'}
            id="top"
        >
            <SiteHeader />
            {children}
            {footer && <SiteFooter />}
        </main>
    );
}
