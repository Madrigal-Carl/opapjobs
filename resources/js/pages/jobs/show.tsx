import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Check, Info, ShieldCheck } from 'lucide-react';
import { JobDetailPanel } from '@/components/applicant/job-detail-panel';
import { JobListingCard } from '@/components/site/job-listing-card';
import { ApplicantScope } from '@/components/applicant/applicant-scope';
import { JobNotFound } from '@/components/applicant/job-not-found';
import { ListedBy } from '@/components/applicant/listed-by';
import { useApplications } from '@/contexts/applications-context';
import { applications, login } from '@/routes';
import { apply as jobApply, index as jobsIndex } from '@/routes/jobs';
import type {
    PublicAgencyListedBy,
    PublicJobPostCard,
    PublicJobPostDetail,
} from '@/types/public-catalog';

type JobShowProps =
    | { jobPost: null }
    | {
          jobPost: PublicJobPostDetail;
          agency: PublicAgencyListedBy;
          otherJobsFromAgency: PublicJobPostCard[];
          relatedJobs: PublicJobPostCard[];
      };

/**
 * The full job post.
 *
 * The browse page previews a job in a sticky column; this page is the same
 * panel given room to breathe, plus the agency behind it and the rest of
 * that agency's openings. It is the page a shared link resolves to, so it
 * has to be readable on its own with no list in view.
 *
 * The server decides visibility: `jobPost` is `null` when the public may not
 * see it, and a closed or expired job post only arrives for an applicant who
 * applied to it.
 */
export default function JobShow(props: JobShowProps) {
    return (
        <ApplicantScope>
            {props.jobPost === null ? (
                <JobNotFound />
            ) : (
                <JobShowContent {...props} />
            )}
        </ApplicantScope>
    );
}

function JobShowContent({
    jobPost: job,
    agency,
    otherJobsFromAgency,
    relatedJobs,
}: Exclude<JobShowProps, { jobPost: null }>) {
    const { props } = usePage();
    const user = props.auth.user;
    const { isApplied, isSaved, toggleSaved } = useApplications();

    const isClosed = !job.isAcceptingApplications;
    // Guests are sent to sign in and returned to this job post afterwards.
    const applyHref = user ? jobApply.url(job.id) : login.url();
    const applied = isApplied(job.id);

    return (
        <>
            <Head>
                <title>{`${job.title} — ${job.agency} | OPAP Job Abroad`}</title>
                <meta
                    name="description"
                    content={`${job.title} with ${job.agency} in ${job.location}. ${job.salary}.`.slice(
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
                            isSaved={isSaved(job.id)}
                            onToggleSaved={() => toggleSaved(job.id)}
                            applyHref={applyHref}
                            isApplied={applied}
                            isClosed={isClosed}
                            listedBy={
                                <ListedBy
                                    agency={agency}
                                    contact={job.contact}
                                />
                            }
                        />

                        {isClosed && (
                            <p
                                className="job-closed-notice"
                                role="status"
                                data-testid="status-job-closed"
                            >
                                <Info size={15} aria-hidden="true" />
                                This job post has closed and is no longer
                                accepting applications. Your application stays
                                in your My Jobs list.
                            </p>
                        )}

                        {!isClosed && applied && (
                            <p
                                className="job-applied-notice"
                                role="status"
                                data-testid="status-job-applied"
                            >
                                <Check size={15} aria-hidden="true" />
                                You have already applied to this role. Track it
                                from{' '}
                                <Link href={applications.url()}>My Jobs</Link>.
                            </p>
                        )}

                        {job.employerHidden && (
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

            <RelatedSection
                id="job-related-title"
                eyebrow="KEEP EXPLORING"
                title="More jobs from this agency."
                jobs={otherJobsFromAgency}
                testIdPrefix="card-related"
                isSaved={isSaved}
                toggleSaved={toggleSaved}
            />

            <RelatedSection
                id="job-similar-title"
                eyebrow="YOU MIGHT ALSO CONSIDER"
                title="Similar roles from other agencies."
                jobs={relatedJobs}
                testIdPrefix="card-similar"
                isSaved={isSaved}
                toggleSaved={toggleSaved}
            />
        </>
    );
}

function RelatedSection({
    id,
    eyebrow,
    title,
    jobs,
    testIdPrefix,
    isSaved,
    toggleSaved,
}: {
    id: string;
    eyebrow: string;
    title: string;
    jobs: PublicJobPostCard[];
    testIdPrefix: string;
    isSaved: (jobId: string) => boolean;
    toggleSaved: (jobId: string) => void;
}) {
    if (jobs.length === 0) {
        return null;
    }

    return (
        <section className="job-related-section" aria-labelledby={id}>
            <div className="shell">
                <div className="job-related-head">
                    <div>
                        <div className="eyebrow">
                            <span className="eyebrow-rule" /> {eyebrow}
                        </div>
                        <h2 id={id}>{title}</h2>
                    </div>
                    <span className="job-related-count">
                        {jobs.length} more verified role
                        {jobs.length === 1 ? '' : 's'}
                    </span>
                </div>

                <div className="job-related-grid">
                    {jobs.map((item) => (
                        <JobListingCard
                            key={item.id}
                            job={item}
                            isSaved={isSaved(item.id)}
                            onToggleSaved={() => toggleSaved(item.id)}
                            testId={`${testIdPrefix}-${item.id}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
