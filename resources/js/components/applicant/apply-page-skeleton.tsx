import { Skeleton } from '@/components/ui/skeleton';

export function ApplyPageSkeleton({ stepCount }: { stepCount: number }) {
    return (
        <section
            className="apply-body"
            aria-busy="true"
            data-testid="skeleton-apply-page"
        >
            <p className="sr-only" role="status">
                Loading your application…
            </p>
            <div className="shell" aria-hidden="true">
                <div className="mb-8 flex items-center gap-4">
                    <Skeleton className="size-16 shrink-0 motion-reduce:animate-none" />
                    <div className="grid flex-1 gap-3">
                        <Skeleton className="h-7 w-3/4 max-w-md motion-reduce:animate-none" />
                        <Skeleton className="h-4 w-full max-w-sm motion-reduce:animate-none" />
                        <Skeleton className="h-3 w-32 motion-reduce:animate-none" />
                    </div>
                </div>
                <div
                    className="mb-8 grid gap-4"
                    style={{
                        gridTemplateColumns: `repeat(${stepCount}, minmax(0, 1fr))`,
                    }}
                >
                    {Array.from({ length: stepCount }, (_, index) => (
                        <div
                            className="grid justify-items-center gap-3"
                            key={index}
                        >
                            <Skeleton className="size-7 rounded-full motion-reduce:animate-none" />
                            <Skeleton className="h-3 w-full max-w-28 motion-reduce:animate-none" />
                        </div>
                    ))}
                </div>
                <div className="apply-form-column">
                    <div className="apply-card grid gap-6">
                        <div className="grid gap-3">
                            <Skeleton className="h-6 w-2/3 max-w-xs motion-reduce:animate-none" />
                            <Skeleton className="h-4 w-full motion-reduce:animate-none" />
                        </div>
                        {[0, 1, 2].map((index) => (
                            <div className="grid gap-3" key={index}>
                                <Skeleton className="h-4 w-28 motion-reduce:animate-none" />
                                <Skeleton className="h-20 w-full motion-reduce:animate-none" />
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 flex justify-between gap-4">
                        <Skeleton className="h-10 w-20 motion-reduce:animate-none" />
                        <Skeleton className="h-10 w-36 motion-reduce:animate-none" />
                    </div>
                </div>
            </div>
        </section>
    );
}
