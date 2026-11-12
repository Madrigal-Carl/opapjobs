import { Skeleton } from '@/components/ui/skeleton';

/**
 * Stand-in for the resume editor while a visit to it is in flight, shaped
 * like the page it covers — the navy hero, the card stack and the rail — so
 * the loading state reads as the editor rather than a generic page.
 */
export function ResumePageSkeleton() {
    return (
        <div
            className="fixed inset-0 z-[1030] overflow-y-auto bg-[var(--cream)]"
            aria-busy="true"
            data-testid="resume-page-skeleton"
        >
            <p className="sr-only" role="status">
                Loading your resume…
            </p>

            <div aria-hidden="true">
                <section className="resume-hero">
                    <div className="shell resume-hero-inner">
                        <div>
                            <Skeleton className="h-3 w-36 motion-reduce:animate-none" />
                            <Skeleton className="mt-5 h-16 w-3/4 motion-reduce:animate-none" />
                            <Skeleton className="mt-5 h-16 w-2/3 motion-reduce:animate-none" />
                            <Skeleton className="mt-6 h-4 w-full max-w-md motion-reduce:animate-none" />
                        </div>
                        <div>
                            <Skeleton className="h-24 w-full max-w-xs motion-reduce:animate-none" />
                            <Skeleton className="mt-4 h-3 w-2/3 motion-reduce:animate-none" />
                        </div>
                    </div>
                </section>

                <section className="resume-section">
                    <div className="shell">
                        <div className="resume-columns">
                            <div>
                                {/* How agencies see you */}
                                <div className="resume-card">
                                    <div className="resume-card-head">
                                        <div className="resume-card-title">
                                            <Skeleton className="size-4 shrink-0 motion-reduce:animate-none" />
                                            <Skeleton className="h-5 w-44 motion-reduce:animate-none" />
                                        </div>
                                    </div>
                                    <div className="resume-identity">
                                        <Skeleton className="size-14 shrink-0 rounded-full motion-reduce:animate-none" />
                                        <div className="grid gap-2">
                                            <Skeleton className="h-5 w-32 motion-reduce:animate-none" />
                                            <Skeleton className="h-3 w-48 motion-reduce:animate-none" />
                                        </div>
                                    </div>
                                    <div className="apply-field-stack">
                                        <div className="field-row">
                                            <Skeleton className="h-9 w-full" />
                                            <Skeleton className="h-9 w-full" />
                                        </div>
                                        <Skeleton className="h-9 w-full" />
                                        <Skeleton className="h-11 w-full rounded-md motion-reduce:animate-none" />
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="resume-card">
                                    <div className="resume-card-head">
                                        <div className="resume-card-title">
                                            <Skeleton className="size-4 shrink-0 motion-reduce:animate-none" />
                                            <Skeleton className="h-5 w-20 motion-reduce:animate-none" />
                                        </div>
                                    </div>
                                    <Skeleton className="mt-4 h-3 w-3/4 motion-reduce:animate-none" />
                                    <div className="mt-5">
                                        <Skeleton className="h-20 w-full motion-reduce:animate-none" />
                                    </div>
                                </div>

                                {/* Experience */}
                                <div className="resume-card">
                                    <div className="resume-card-head">
                                        <div className="resume-card-title">
                                            <Skeleton className="size-4 shrink-0 motion-reduce:animate-none" />
                                            <Skeleton className="h-5 w-28 motion-reduce:animate-none" />
                                        </div>
                                        <Skeleton className="h-8 w-28 shrink-0 rounded-md motion-reduce:animate-none" />
                                    </div>
                                    <Skeleton className="mt-4 h-3 w-2/3 motion-reduce:animate-none" />
                                    <div className="resume-entries">
                                        <div className="resume-entry">
                                            <div className="resume-entry-head">
                                                <div className="grid gap-2">
                                                    <Skeleton className="h-4 w-40 motion-reduce:animate-none" />
                                                    <Skeleton className="h-3 w-56 motion-reduce:animate-none" />
                                                </div>
                                                <Skeleton className="h-8 w-20 shrink-0 rounded-md motion-reduce:animate-none" />
                                            </div>
                                            <Skeleton className="mt-3 h-3 w-32 motion-reduce:animate-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Education */}
                                <div className="resume-card">
                                    <div className="resume-card-head">
                                        <div className="resume-card-title">
                                            <Skeleton className="size-4 shrink-0 motion-reduce:animate-none" />
                                            <Skeleton className="h-5 w-28 motion-reduce:animate-none" />
                                        </div>
                                        <Skeleton className="h-8 w-32 shrink-0 rounded-md motion-reduce:animate-none" />
                                    </div>
                                    <Skeleton className="mt-4 h-3 w-2/3 motion-reduce:animate-none" />
                                    <div className="resume-entries">
                                        <div className="resume-entry">
                                            <div className="resume-entry-head">
                                                <div className="grid gap-2">
                                                    <Skeleton className="h-4 w-40 motion-reduce:animate-none" />
                                                    <Skeleton className="h-3 w-48 motion-reduce:animate-none" />
                                                </div>
                                                <Skeleton className="h-8 w-20 shrink-0 rounded-md motion-reduce:animate-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Certifications */}
                                <div className="resume-card">
                                    <div className="resume-card-head">
                                        <div className="resume-card-title">
                                            <Skeleton className="size-4 shrink-0 motion-reduce:animate-none" />
                                            <Skeleton className="h-5 w-28 motion-reduce:animate-none" />
                                        </div>
                                        <Skeleton className="h-8 w-32 shrink-0 rounded-md motion-reduce:animate-none" />
                                    </div>
                                    <Skeleton className="mt-4 h-3 w-2/3 motion-reduce:animate-none" />
                                    <div className="resume-entries">
                                        <div className="resume-entry">
                                            <div className="resume-entry-head">
                                                <div className="grid gap-2">
                                                    <Skeleton className="h-4 w-40 motion-reduce:animate-none" />
                                                    <Skeleton className="h-3 w-48 motion-reduce:animate-none" />
                                                </div>
                                                <Skeleton className="h-8 w-20 shrink-0 rounded-md motion-reduce:animate-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Skills */}
                                <div className="resume-card">
                                    <div className="resume-card-head">
                                        <div className="resume-card-title">
                                            <Skeleton className="size-4 shrink-0 motion-reduce:animate-none" />
                                            <Skeleton className="h-5 w-20 motion-reduce:animate-none" />
                                        </div>
                                    </div>
                                    <Skeleton className="mt-4 h-3 w-2/3 motion-reduce:animate-none" />
                                    <div className="resume-skill-row">
                                        <Skeleton className="h-9 w-full" />
                                        <Skeleton className="h-9 w-full" />
                                        <Skeleton className="h-8 w-16 shrink-0 rounded-md motion-reduce:animate-none" />
                                    </div>
                                    <div className="resume-skill-list">
                                        <div className="resume-skill">
                                            <Skeleton className="h-3 w-40 motion-reduce:animate-none" />
                                            <Skeleton className="flex h-1.5 w-3 gap-3 rounded-full motion-reduce:animate-none" />
                                            <Skeleton className="h-8 w-10 shrink-0 rounded-md motion-reduce:animate-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Documents */}
                                <div className="resume-card">
                                    <div className="resume-card-head">
                                        <div className="resume-card-title">
                                            <Skeleton className="size-4 shrink-0 motion-reduce:animate-none" />
                                            <Skeleton className="h-5 w-20 motion-reduce:animate-none" />
                                        </div>
                                        <Skeleton className="h-8 w-36 shrink-0 rounded-md motion-reduce:animate-none" />
                                    </div>
                                    <Skeleton className="mt-4 h-3 w-2/3 motion-reduce:animate-none" />
                                    <div className="resume-doc-list">
                                        <div className="resume-entry">
                                            <div className="resume-entry-head">
                                                <div className="grid gap-2">
                                                    <Skeleton className="h-4 w-40 motion-reduce:animate-none" />
                                                    <Skeleton className="h-3 w-48 motion-reduce:animate-none" />
                                                </div>
                                                <Skeleton className="h-8 w-8 shrink-0 rounded-md motion-reduce:animate-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <aside className="resume-rail">
                                <div className="resume-rail-card">
                                    <Skeleton className="h-2 w-32 motion-reduce:animate-none" />
                                    <div className="resume-completeness">
                                        <Skeleton className="h-2.5 w-full rounded-full motion-reduce:animate-none" />
                                        <Skeleton className="h-6 w-12 motion-reduce:animate-none" />
                                    </div>
                                    <ul className="resume-checklist">
                                        {Array.from(
                                            { length: 6 },
                                            (_, index) => (
                                                <li
                                                    className="resume-check"
                                                    key={index}
                                                >
                                                    <Skeleton className="size-3.5 rounded-full motion-reduce:animate-none" />
                                                    <Skeleton className="h-3 w-24 motion-reduce:animate-none" />
                                                    <Skeleton className="ml-auto h-3 w-8 motion-reduce:animate-none" />
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                                <div className="resume-rail-card">
                                    <Skeleton className="h-2 w-36 motion-reduce:animate-none" />
                                    <Skeleton className="h-3 w-full motion-reduce:animate-none" />
                                    <Skeleton className="h-3 w-5/6 motion-reduce:animate-none" />
                                    <div className="flex gap-2">
                                        <Skeleton className="h-8 w-36 rounded-md motion-reduce:animate-none" />
                                        <Skeleton className="h-8 w-40 rounded-md motion-reduce:animate-none" />
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
