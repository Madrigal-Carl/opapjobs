import { Skeleton } from '@/components/ui/skeleton';
import { useProfilePageLoading } from '@/hooks/use-applicant-page-loading';

const pulse = 'motion-reduce:animate-none';

/**
 * Stand-in for the profile editor while the router is still fetching it, so
 * the skeleton can cover the viewport from outside the page it replaces.
 */
export function ProfilePageSkeletonLoader() {
    const loading = useProfilePageLoading();

    if (!loading) {
        return null;
    }

    return <ProfilePageSkeleton />;
}

/**
 * Stand-in for the profile editor while a visit to it is in flight, shaped
 * like the page it covers — the navy identity header, the section cards and
 * the strength rail — so the loading state reads as the profile rather than
 * a generic page.
 */
export function ProfilePageSkeleton() {
    return (
        <div
            className="fixed inset-0 z-[1030] overflow-y-auto bg-[var(--cream)]"
            aria-busy="true"
            data-testid="profile-page-skeleton"
        >
            <p className="sr-only" role="status">
                Loading your profile…
            </p>

            <div aria-hidden="true">
                <section className="profile-hero">
                    <div className="shell">
                        <div className="profile-hero-inner">
                            <div className="profile-identity">
                                <Skeleton
                                    className={`size-[104px] shrink-0 rounded-full ${pulse}`}
                                />
                                <div className="grid flex-1 gap-3">
                                    <Skeleton className={`h-3 w-28 ${pulse}`} />
                                    <Skeleton className={`h-9 w-64 ${pulse}`} />
                                    <Skeleton className={`h-4 w-48 ${pulse}`} />
                                    <Skeleton
                                        className={`h-3 w-full max-w-sm ${pulse}`}
                                    />
                                </div>
                            </div>
                            <Skeleton className={`h-11 w-36 ${pulse}`} />
                        </div>
                        <div className="profile-hero-bar">
                            <Skeleton
                                className={`h-6 w-full max-w-md ${pulse}`}
                            />
                        </div>
                    </div>
                </section>

                <section className="profile-body">
                    <div className="shell">
                        <div className="profile-columns">
                            <div className="profile-main">
                                {[3, 2, 2, 2].map((rows, index) => (
                                    <div className="profile-card" key={index}>
                                        <div className="profile-card-head">
                                            <Skeleton
                                                className={`h-6 w-44 ${pulse}`}
                                            />
                                            <Skeleton
                                                className={`h-9 w-28 ${pulse}`}
                                            />
                                        </div>
                                        <div className="mt-5 grid gap-5">
                                            {Array.from({ length: rows }).map(
                                                (_, row) => (
                                                    <div
                                                        className="flex gap-4"
                                                        key={row}
                                                    >
                                                        <Skeleton
                                                            className={`size-12 shrink-0 rounded-lg ${pulse}`}
                                                        />
                                                        <div className="grid flex-1 gap-2">
                                                            <Skeleton
                                                                className={`h-4 w-1/2 ${pulse}`}
                                                            />
                                                            <Skeleton
                                                                className={`h-3 w-1/3 ${pulse}`}
                                                            />
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <aside className="profile-rail">
                                <div className="profile-rail-card">
                                    <Skeleton className={`h-3 w-32 ${pulse}`} />
                                    <Skeleton
                                        className={`h-10 w-24 ${pulse}`}
                                    />
                                    <Skeleton
                                        className={`h-2 w-full ${pulse}`}
                                    />
                                    <Skeleton
                                        className={`h-14 w-full ${pulse}`}
                                    />
                                    {Array.from({ length: 6 }).map((_, row) => (
                                        <Skeleton
                                            className={`h-6 w-full ${pulse}`}
                                            key={row}
                                        />
                                    ))}
                                </div>
                            </aside>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
