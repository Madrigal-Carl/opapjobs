import { Skeleton } from '@/components/ui/skeleton';
import { useApplicantPageLoading } from '@/hooks/use-applicant-page-loading';
import { useEffect, useRef } from 'react';

/**
 * A full-screen stand-in for an applicant page while the server renders it.
 *
 * Inertia keeps the page being left on mounted until the response lands, so
 * the skeleton covers the viewport instead of replacing content the router
 * has not swapped yet, and it clears the moment that swap happens. It sits
 * just under Inertia's own progress bar (injected at z-index 1031) so both
 * loading signals stay visible at once.
 */
export function ApplicantPageSkeleton() {
    const loading = useApplicantPageLoading();
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!loading) {
            return;
        }

        // Move focus into the stand-in so a screen reader is not left parked on
        // the content that is about to be swapped out for the real page.
        containerRef.current?.focus();
    }, [loading]);

    if (!loading) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            tabIndex={-1}
            className="fixed inset-0 z-[1030] overflow-y-auto bg-[var(--cream)]"
            aria-busy="true"
            data-testid="applicant-page-skeleton"
        >
            <p className="sr-only" role="status">
                Loading page…
            </p>
            <div aria-hidden="true">
                {/* The fixed site header the real page would carry. */}
                <div className="flex min-h-[74px] items-center justify-between gap-8 px-6">
                    <Skeleton className="h-7 w-24 motion-reduce:animate-none" />
                    <div className="hidden items-center gap-6 md:flex">
                        <Skeleton className="h-3.5 w-16 motion-reduce:animate-none" />
                        <Skeleton className="h-3.5 w-20 motion-reduce:animate-none" />
                        <Skeleton className="h-3.5 w-14 motion-reduce:animate-none" />
                    </div>
                    <Skeleton className="h-9 w-28 motion-reduce:animate-none" />
                </div>
                <div className="shell py-12">
                    <div className="grid gap-4">
                        <Skeleton className="h-3 w-28 motion-reduce:animate-none" />
                        <Skeleton className="h-9 w-2/3 max-w-md motion-reduce:animate-none" />
                        <Skeleton className="h-4 w-full max-w-xl motion-reduce:animate-none" />
                    </div>
                    <div className="mt-8 grid gap-4">
                        {[0, 1, 2].map((row) => (
                            <div className="flex items-start gap-3" key={row}>
                                <Skeleton className="size-9 shrink-0 motion-reduce:animate-none" />
                                <div className="flex-1 space-y-2.5">
                                    <Skeleton className="h-3 w-24 motion-reduce:animate-none" />
                                    <Skeleton className="h-4 w-2/3 motion-reduce:animate-none" />
                                    <Skeleton className="h-3 w-1/2 motion-reduce:animate-none" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
