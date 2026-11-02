import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { ApplicantProfileProvider } from '@/contexts/applicant-profile-context';
import { ApplicationsProvider } from '@/contexts/applications-context';
import type { ProfileOwner } from '@/types/applicant-profile';

/**
 * Wraps an applicant-facing page in the state it needs.
 *
 * This cannot live in `withApp`, because that sits above the Inertia context
 * and so cannot read the signed-in user. Scoping it per page instead keeps
 * the dashboard side free of applicant state entirely, which is the same
 * separation the routes already enforce.
 *
 * Both read the database: the applied / saved lists come from the shared
 * `applicantActivity` prop and the resume from the page's `resume` prop.
 * A guest gets an empty profile and empty lists.
 */
export function ApplicantScope({ children }: { children: ReactNode }) {
    const { props } = usePage();
    const user = props.auth.user;

    const owner: ProfileOwner | null = user
        ? {
              name: user.name,
              email: user.email,
              avatar: user.avatar,
          }
        : null;

    return (
        <ApplicantProfileProvider owner={owner}>
            <ApplicationsProvider>{children}</ApplicationsProvider>
        </ApplicantProfileProvider>
    );
}
