import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ApplicationsProvider } from '@/contexts/applications-context';
import ApplicantLayout from '@/components/applicant/applicant-layout';
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
                return [PublicLayout, { className: 'jobs-page' }];
            case name === 'jobs/show':
                return [PublicLayout, { className: 'job-detail-page' }];
            case name === 'jobs/apply':
                return [
                    ApplicantLayout,
                    { className: 'apply-page', footer: false },
                ];
            case name === 'applicant/applications':
                return [ApplicantLayout, { className: 'applications-page' }];
            case name === 'applicant/resume':
                return [
                    ApplicantLayout,
                    { className: 'resume-page', footer: false },
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
            <ApplicationsProvider>
                <TooltipProvider delayDuration={0}>
                    {app}
                    <Toaster />
                </TooltipProvider>
            </ApplicationsProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
