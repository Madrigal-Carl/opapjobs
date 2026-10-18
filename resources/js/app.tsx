import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import PublicLayout from '@/layouts/public-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

const fullBleedAuthPages = [
    'auth/login',
    'auth/register',
    'auth/forgot-password',
    'auth/verify-email',
];

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
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
                return [PublicLayout, { className: 'agencies-page' }];
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
                return [PublicLayout, { className: 'applicant-page' }];
            case name === 'applicant/applications':
                return [PublicLayout, { className: 'applicant-page' }];
            case name === 'applicant/resume':
                return [PublicLayout, { className: 'applicant-page' }];
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
