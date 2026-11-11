import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import PublicLayout from '@/layouts/public-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { jobs } from '@/routes/dashboard';

/** Every page shares one browser-tab title; per-page `<Head title>` values are ignored. */
const PAGE_TITLE = 'OPAP Jobs Abroad';

const fullBleedAuthPages = [
    'auth/login',
    'auth/register',
    'auth/forgot-password',
    'auth/verify-email',
];

void createInertiaApp({
    title: () => PAGE_TITLE,
    defaults: {
        visitOptions: (href, options) => {
            // A late deferred KPI response must not undo a newer Jobs filter URL.
            const isJobPostKpiReload =
                new URL(href, window.location.href).pathname === jobs().url &&
                options.only?.length === 1 &&
                options.only[0] === 'kpis';

            return isJobPostKpiReload ? { preserveUrl: true } : {};
        },
    },
    layout: (name) => {
        switch (true) {
            case fullBleedAuthPages.includes(name):
                return null;
            case name === 'auth/confirm-password':
                return AppLayout;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            case name === 'home':
                return PublicLayout;
            case name === 'agencies/index':
                // Matches the jobs pages: the directory is a starting point
                // applicants leave from, not somewhere they stay.
                return [
                    PublicLayout,
                    { className: 'agencies-page', footer: false },
                ];
            case name === 'agencies/show':
                return [
                    PublicLayout,
                    { className: 'agency-profile-page', footer: false },
                ];
            case name === 'jobs/index':
                // The list grows under the reader as they scroll, so the
                // footer would only ever appear at the very end of a
                // scroll that has no natural end. Same reasoning as the
                // job listing page.
                return [
                    PublicLayout,
                    { className: 'jobs-page', footer: false },
                ];
            case name === 'jobs/show':
                // A listing is read to the end and then replaced by the next
                // one, so the marketing footer is dropped here rather than
                // sitting below four rows nobody scrolls to.
                return [
                    PublicLayout,
                    { className: 'job-detail-page', footer: false },
                ];
            case name === 'jobs/apply':
                // The wizard ends in a submitted state that links onwards, so
                // there is nothing under it to reach. The footer would only
                // ever sit below an action bar the applicant has already
                // used.
                return [
                    PublicLayout,
                    { className: 'applicant-page', footer: false },
                ];
            case name === 'applicant/applications':
                return [PublicLayout, { className: 'applicant-page' }];
            case name === 'applicant/resume':
                // An editor, not a page read to the end: the marketing
                // footer would only sit below the last resume section.
                return [
                    PublicLayout,
                    { className: 'applicant-page', footer: false },
                ];
            case name === 'contact':
                return [PublicLayout, { className: 'contact-page' }];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
