import { Skeleton } from '@/components/ui/skeleton';

/** How many placeholder rows stand in for the list on first paint. */
const SKELETON_ROWS = 5;

/**
 * Placeholder rows shown for the single frame between mount and the job list
 * resolving, so the two-pane layout does not snap into place.
 */
export function JobListSkeleton() {
    return (
        <div
            className="jobs-skeleton"
            data-testid="jobs-skeleton"
            aria-hidden="true"
        >
            {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
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
