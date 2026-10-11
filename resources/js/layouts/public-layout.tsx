import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';

/**
 * Chrome shared by every public marketing page: fixed header, page content,
 * footer. The `opap-page` wrapper carries the OPAP page background and the
 * `#top` anchor the header links back to.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
    return (
        <main className="opap-page" id="top">
            <SiteHeader />
            {children}
            <SiteFooter />
        </main>
    );
}
