import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { cn } from '@/lib/utils';

type ApplicantLayoutProps = {
    children: ReactNode;
    /** Extra classes on the page wrapper (e.g. `resume-page`). */
    className?: string;
    /** Set false on working surfaces that omit the marketing footer. */
    footer?: boolean;
};

/**
 * Chrome for the applicant-only surfaces: apply wizard, resume and My Jobs.
 *
 * Shares the marketing header with the rest of the public site, but pins it
 * to the top of the navy band instead of letting it float over the hero, so
 * the applicant always has the Jobs, Agencies and account menus to hand.
 */
export default function ApplicantLayout({
    children,
    className,
    footer = true,
}: ApplicantLayoutProps) {
    return (
        <main className={cn('opap-page applicant-page', className)} id="top">
            <SiteHeader />
            {children}
            {footer && <SiteFooter />}
        </main>
    );
}
