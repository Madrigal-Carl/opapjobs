import {
    ArrowRight,
    BriefcaseBusiness,
    CheckCircle2,
    Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { applications as applicationsRoute } from '@/routes';
import { index as jobsIndex } from '@/routes/jobs';
import type { Job } from '@/types/job';

const NEXT_STEPS = [
    'The agency reviews your resume and answers.',
    'You can track the application from My Jobs.',
    'Keep your documents ready in case they ask for copies.',
];

/**
 * The end of the apply wizard. Replaces the whole wizard body once the
 * application has been handed over.
 */
export function SubmitSuccess({
    job,
    applicantName,
}: {
    job: Job;
    applicantName: string;
}) {
    return (
        <div
            className="flex flex-col items-center rounded-md border border-[var(--line)] bg-white px-6 py-14 text-center shadow-sm"
            data-testid="application-success"
        >
            <svg
                viewBox="0 0 100 100"
                className="h-24 w-24"
                aria-hidden="true"
                focusable="false"
            >
                <circle
                    className="opap-success-circle"
                    cx="50"
                    cy="50"
                    r="48"
                    fill="none"
                    strokeWidth="4"
                />
                <path
                    className="opap-success-check"
                    d="M30 51 L45 66 L72 38"
                    fill="none"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>

            <h1 className="mt-6 font-serif text-2xl font-extrabold tracking-[-0.03em] text-[var(--navy)]">
                Application submitted, {applicantName}!
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--slate)]">
                Your application for{' '}
                <strong className="font-semibold text-[var(--ink)]">
                    {job.title}
                </strong>{' '}
                at{' '}
                <strong className="font-semibold text-[var(--ink)]">
                    {job.agency}
                </strong>{' '}
                is in. The agency will review your profile and contact you about
                next steps.
            </p>

            <div className="mt-8 w-full max-w-md rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-left">
                <p className="font-mono text-[10px] tracking-[0.1em] text-[var(--teal)] uppercase">
                    What happens next
                </p>
                <ol className="mt-3 grid gap-2.5">
                    {NEXT_STEPS.map((step, index) => (
                        <li
                            key={step}
                            className="flex items-start gap-2 text-xs leading-relaxed text-[var(--slate)]"
                        >
                            <StepIcon index={index} />
                            {step}
                        </li>
                    ))}
                </ol>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild data-testid="link-view-applications">
                    <a href={applicationsRoute.url()}>
                        Track my applications
                        <ArrowRight aria-hidden="true" />
                    </a>
                </Button>
                <Button
                    variant="secondary"
                    asChild
                    data-testid="link-browse-more-jobs"
                >
                    <a href={jobsIndex.url()}>Browse more jobs</a>
                </Button>
            </div>
        </div>
    );
}

function StepIcon({ index }: { index: number }) {
    const props = {
        size: 13,
        className: 'mt-0.5 shrink-0 text-[var(--teal)]',
        'aria-hidden': true,
    } as const;

    if (index === 0) {
        return <CheckCircle2 {...props} />;
    }

    if (index === 1) {
        return <Compass {...props} />;
    }

    return <BriefcaseBusiness {...props} />;
}
