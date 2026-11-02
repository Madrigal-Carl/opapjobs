import type { ApplicationActivity } from '@/types/application-draft';
import type { Auth } from '@/types/auth';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            /** The signed-in applicant's job post ids per My Jobs tab; `null` for everyone else. */
            applicantActivity?: ApplicationActivity | null;
            [key: string]: unknown;
        };
    }
}
