import { Head, usePage } from '@inertiajs/react';
import { ArrowLeft, Check, Info, ShieldCheck } from 'lucide-react';
import { JobDetailPanel } from '@/components/applicant/job-detail-panel';
import { JobListingCard } from '@/components/site/job-listing-card';
import { ApplicantScope } from '@/components/applicant/applicant-scope';
import { JobNotFound } from '@/components/applicant/job-not-found';
import { ListedBy } from '@/components/applicant/listed-by';
import { useApplications } from '@/contexts/applications-context';
import { findAgency } from '@/data/agency-lookup';
import { isAcceptingApplications, isManpooling } from '@/data/job-attributes';
import { getOtherJobsFromAgency } from '@/data/job-browse';
import { getJobList } from '@/data/job-store';
import { applications, login } from '@/routes';
import { apply as jobApply, index as jobsIndex } from '@/routes/jobs';
import type { Job } from '@/types/job';

type JobShowProps = {
    jobId: string;
};

/**
 * The full listing.
 *
 * The browse page previews a job in a sticky column; this page is the same
 * panel given room to breathe, plus the agency behind it and the rest of
 * that agency's openings. It is the page a shared link resolves to, so it
 * has to be readable on its own with no list in view.
 *
 * The marketing footer is dropped here — see the layout mapping in
 * `app.tsx`. Everything below the last row is dead space on a page people
 * read once and leave.
 */
export default function JobShow({ jobId }: JobShowProps) {
    return (
        <ApplicantScope>
            <JobShowBody jobId={jobId} />
        </ApplicantScope>
    );
}

function JobShowBody({ jobId }: JobShowProps) {
    const { props } = usePage();
    const user = props.auth.user;
    const { isApplied, isSaved, toggleSaved } = useApplications();

    const job = getJobList().find((item) => item.id === jobId);

    if (!job) {
        return <JobNotFound />;
    }

    const isClosed = !isAcceptingApplications(job);

    // Guests are sent to sign in and returned to this listing afterwards.
    const applyHref = user ? jobApply.url(jobId) : login.url();

    return (
        <JobShowContent
            job={job}
            isClosed={isClosed}
            applyHref={applyHref}
            isApplied={isApplied(job.id)}
            saved={isSaved(job.id)}
            onToggleSaved={() => toggleSaved(job.id)}
        />
    );
}

function JobShowContent({
    job,
    isClosed,
    applyHref,
    isApplied,
    saved,
    onToggleSaved,
}: {
    job: Job;
    isClosed: boolean;
    applyHref: string;
    isApplied: boolean;
    saved: boolean;
    onToggleSaved: () => void;
}) {
    const { isSaved, toggleSaved } = useApplications();

    const agency = findAgency(job.agency);
    // Same agency only, because the heading below says "from this agency".
    const alsoFromAgency = getOtherJobsFromAgency(job);

    return (
        <>
            <Head>
                <title>{`${job.title} — ${job.agency} | OPAP Job Abroad`}</title>
                <meta
                    name="description"
                    content={`${job.title} with ${job.agency}. ${job.description ?? ''}`.slice(
                        0,
                        180,
                    )}
                />
            </Head>

            <section className="job-detail-page-section">
                <div className="shell">
                    <a
                        className="job-detail-back-link"
                        href={jobsIndex.url()}
                        data-testid="link-job-back"
                    >
                        <ArrowLeft size={15} aria-hidden="true" /> Back to
                        verified jobs
                    </a>

                    <div className="job-detail-page-content">
                        <JobDetailPanel
                            job={job}
                            isSaved={saved}
                            onToggleSaved={onToggleSaved}
                            applyHref={applyHref}
                            isApplied={isApplied}
                            isClosed={isClosed}
                            listedBy={
                                agency ? (
                                    <ListedBy agency={agency} contact={job} />
                                ) : null
                            }
                        />

                        {isClosed && (
                            <p
                                className="job-closed-notice"
                                role="status"
                                data-testid="status-job-closed"
                            >
                                <Info size={15} aria-hidden="true" />
                                This listing has closed and is no longer
                                accepting applications. Saved and archived
                                copies stay in your My Jobs list.
                            </p>
                        )}

                        {!isClosed && isApplied && (
                            <p
                                className="job-applied-notice"
                                role="status"
                                data-testid="status-job-applied"
                            >
                                <Check size={15} aria-hidden="true" />
                                You have already applied to this role. Track it
                                from <a href={applications.url()}>My Jobs</a>.
                            </p>
                        )}

                        {isManpooling(job) && (
                            <p
                                className="job-manpooling-note"
                                data-testid="job-manpooling-note"
                            >
                                <ShieldCheck size={15} aria-hidden="true" />
                                <span>
                                    This is a manpooling vacancy. The hiring
                                    company is not named here — you apply and
                                    are placed through{' '}
                                    <strong>{job.agency}</strong>, the
                                    accredited agency that posted it.
                                </span>
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {alsoFromAgency.length >= 2 && (
                <section
                    className="job-related-section"
                    aria-labelledby="job-related-title"
                >
                    <div className="shell">
                        <div className="job-related-head">
                            <div>
                                <div className="eyebrow">
                                    <span className="eyebrow-rule" /> KEEP
                                    EXPLORING
                                </div>
                                <h2 id="job-related-title">
                                    More jobs from this agency.
                                </h2>
                            </div>
                            <span className="job-related-count">
                                {alsoFromAgency.length} more verified role
                                {alsoFromAgency.length === 1 ? '' : 's'}
                            </span>
                        </div>

                        <div className="job-related-grid">
                            {alsoFromAgency.map((item) => (
                                <JobListingCard
                                    key={item.id}
                                    job={item}
                                    isSaved={isSaved(item.id)}
                                    onToggleSaved={() => toggleSaved(item.id)}
                                    testId={`card-related-${item.id}`}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </>
    );
}
