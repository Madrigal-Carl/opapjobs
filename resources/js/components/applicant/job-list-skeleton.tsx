import { Skeleton } from '@/components/ui/skeleton';

/** How many placeholder rows stand in for the list while a search resolves. */
const SKELETON_ROWS = 5;

type JobListSkeletonProps = {
    rows?: number;
    testId?: string;
};

/**
 * Placeholder job cards shown while job posts are being fetched: covering the
 * list for a new search, or appended below it while the next batch loads.
 */
export function JobListSkeleton({
    rows = SKELETON_ROWS,
    testId = 'jobs-skeleton',
}: JobListSkeletonProps) {
    return (
        <div className="jobs-skeleton" data-testid={testId} aria-hidden="true">
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="jobs-skeleton-row">
                    <div className="flex items-start gap-3">
                        <Skeleton className="size-9 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-2.5 w-20" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Stand-in for the job preview column while a new search resolves. */
export function JobDetailSkeleton() {
    return (
        <div
            className="job-detail-panel"
            data-testid="job-detail-skeleton"
            aria-hidden="true"
        >
            <div className="flex items-start gap-3">
                <Skeleton className="size-11 shrink-0" />
                <div className="flex-1 space-y-2.5">
                    <Skeleton className="h-2.5 w-28" />
                    <Skeleton className="h-6 w-4/5" />
                    <Skeleton className="h-3 w-40" />
                </div>
            </div>
            <div className="mt-6 flex gap-3">
                <Skeleton className="h-11 w-36" />
                <Skeleton className="h-11 w-28" />
            </div>
            <div className="job-detail-meta">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex gap-3">
                        <Skeleton className="size-[18px] shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-2 w-16" />
                            <Skeleton className="h-3.5 w-full" />
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-7 space-y-2.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-2/3" />
            </div>
        </div>
    );
}
