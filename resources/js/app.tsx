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
