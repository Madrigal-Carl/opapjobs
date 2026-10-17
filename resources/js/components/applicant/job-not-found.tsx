import { Head } from '@inertiajs/react';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { index as jobsIndex } from '@/routes/jobs';

/**
 * The friendly 404 shown when a listing has been removed, closed outright or
 * mistyped. Shared by the job detail page and the apply wizard.
 */
export function JobNotFound({
    title = 'Job opening not found',
}: {
    title?: string;
}) {
    return (
        <>
            <Head title="Job opening not found | OPAP Job Abroad" />
            <div className="py-10 text-center" data-testid="job-not-found">
                <SearchX
                    size={30}
                    className="mx-auto text-[var(--teal)]"
                    aria-hidden="true"
                />
                <h1 className="mt-4 font-serif text-2xl font-extrabold tracking-[-0.04em] text-[var(--navy)]">
                    {title}
                </h1>
                <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[var(--slate)]">
                    That listing may have closed, or the link may be incorrect.
                    Browse the current verified openings to find your next clear
                    step.
                </p>
                <div className="mt-6 flex flex-col items-center gap-3">
                    <Button asChild data-testid="link-job-not-found-browse">
                        <a href={jobsIndex.url()}>Browse verified jobs</a>
                    </Button>
                    <a className="job-detail-back-link" href={jobsIndex.url()}>
                        <ArrowLeft size={15} aria-hidden="true" /> Back to
                        verified jobs
                    </a>
                </div>
            </div>
        </>
    );
}
