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
 * A guest gets a placeholder profile to score a match against and empty
 * applied / saved lists, so no page ever claims they sent an application
 * they did not.
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
            <ApplicationsProvider isGuest={owner === null}>
                {children}
            </ApplicationsProvider>
        </ApplicantProfileProvider>
    );
}
