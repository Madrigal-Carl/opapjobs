import { Head, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    Check,
    Clock3,
    MapPin,
    ShieldCheck,
    Star,
} from 'lucide-react';
import { JobDetailPanel } from '@/components/applicant/job-detail-panel';
import { JobFacts } from '@/components/applicant/job-facts';
import { JobNotFound } from '@/components/applicant/job-not-found';
import { JobListingCard } from '@/components/site/job-listing-card';
import { useApplications } from '@/contexts/applications-context';
import { findAgency } from '@/data/agency-lookup';
import {
    POSTING_TYPE_LABELS,
    getEffectiveStatus,
    getPublicEmployer,
    getPublicLocation,
} from '@/data/job-attributes';
import { getRelatedJobs } from '@/data/job-browse';
import { getJobById } from '@/data/job-store';
import { login } from '@/routes';
import { show as agencyShow } from '@/routes/agencies';
import { apply as jobApply, index as jobsIndex } from '@/routes/jobs';

type JobDetailProps = {
    jobId: string;
};

export default function JobShow({ jobId }: JobDetailProps) {
    const { props } = usePage();
    const user = props.auth.user;
    const { isApplied, isSaved, toggleSaved } = useApplications();

    const job = getJobById(jobId);

    if (!job) {
        return <JobNotFound title="Job opening not found" />;
    }
    const agency = findAgency(job.agency);
    const isClosed = getEffectiveStatus(job) !== 'published';
    const applied = isApplied(job.id);
    const related = getRelatedJobs(job);
    const publicEmployer = getPublicEmployer(job);

    /** Guests sign in first and are returned to this listing afterwards. */
    const applyHref = user ? jobApply.url(job.id) : login.url();

    return (
        <>
            <Head title={`${job.title} — ${job.agency} | OPAP Job Abroad`}>
                <meta
                    name="description"
                    content={`${job.title} in ${getPublicLocation(job)}. ${job.salary}. ${POSTING_TYPE_LABELS[job.postingType]} listing posted by ${job.agency}.`}
                />
            </Head>

            <section className="job-detail-page-section">
                <div className="shell">
                    <a
                        className="job-detail-back-link"
                        href={jobsIndex.url()}
                        data-testid="link-back-to-jobs"
                    >
                        <ArrowLeft size={16} aria-hidden="true" /> Back to
                        verified jobs
                    </a>

                    {isClosed && (
                        <p
                            className="job-closed-notice"
                            role="status"
                            data-testid="status-job-closed"
                        >
                            <Clock3 size={15} aria-hidden="true" />
                            This listing is closed and is no longer accepting
                            applications. Browse the current openings to find
                            your next step.
                        </p>
                    )}

                    {applied && (
                        <p
                            className="job-applied-notice"
                            role="status"
                            data-testid="status-already-applied"
                        >
                            <Check size={15} aria-hidden="true" />
                            You have applied to this role. Track it from My
                            Jobs.
                        </p>
                    )}

                    <div className="job-detail-page-content">
                        <JobDetailPanel
                            job={job}
                            isSaved={isSaved(job.id)}
                            isApplied={applied}
                            isClosed={isClosed}
                            applyHref={applyHref}
                            onToggleSaved={() => toggleSaved(job.id)}
                        />

                        {agency && (
                            <section
                                className="job-detail-section"
                                aria-labelledby="job-agency-title"
                                data-testid="section-job-agency"
                            >
                                <h3 id="job-agency-title">About the agency</h3>
                                <p>{agency.description}</p>
                                <ul className="mt-4">
                                    <li>
                                        <BadgeCheck
                                            size={13}
                                            aria-hidden="true"
                                        />{' '}
                                        {agency.license}
                                    </li>
                                    <li>
                                        <Star
                                            size={13}
                                            fill="currentColor"
                                            aria-hidden="true"
                                        />{' '}
                                        {agency.rating} rating from{' '}
                                        {agency.reviews?.length ?? 0} candidate
                                        reviews
                                    </li>
                                    <li>
                                        <MapPin size={13} aria-hidden="true" />{' '}
                                        {agency.location}
                                        {agency.yearsInOperation
                                            ? ` · ${agency.yearsInOperation} years in operation`
                                            : ''}
                                    </li>
                                    {publicEmployer && (
                                        <li data-testid="job-employer-licence">
                                            <ShieldCheck
                                                size={13}
                                                aria-hidden="true"
                                            />{' '}
                                            {publicEmployer.name} —{' '}
                                            {publicEmployer.poeaLicenseNo}
                                        </li>
                                    )}
                                </ul>
                                <a
                                    className="job-detail-agency-cta"
                                    href={agencyShow.url(agency.slug)}
                                    data-testid="link-job-agency-profile"
                                >
                                    View {agency.name}{' '}
                                    <ArrowRight size={14} aria-hidden="true" />
                                </a>
                            </section>
                        )}

                        {!publicEmployer && (
                            <p
                                className="job-manpooling-note"
                                data-testid="job-manpooling-note"
                            >
                                <ShieldCheck size={15} aria-hidden="true" />
                                This is a <strong>manpooling</strong> listing.
                                The employer is not named, and {job.agency}{' '}
                                shares the full details with shortlisted
                                applicants.
                            </p>
                        )}

                        <section
                            className="job-detail-section"
                            aria-labelledby="job-facts-title"
                            data-testid="section-job-facts"
                        >
                            <h3 id="job-facts-title">Key facts</h3>
                            <JobFacts job={job} />
                        </section>

                        {job.applyInstructions && (
                            <section
                                className="job-detail-section"
                                aria-labelledby="job-contact-title"
                                data-testid="section-job-contact"
                            >
                                <h3 id="job-contact-title">Agency contact</h3>
                                <ul>
                                    {job.contactName && (
                                        <li>{job.contactName}</li>
                                    )}
                                    {job.contactEmail && (
                                        <li>{job.contactEmail}</li>
                                    )}
                                    {job.contactPhone && (
                                        <li>{job.contactPhone}</li>
                                    )}
                                </ul>
                            </section>
                        )}
                    </div>
                </div>
            </section>

            {related.length > 0 && (
                <section
                    className="job-related-section"
                    aria-labelledby="job-related-title"
                    data-testid="section-job-related"
                >
                    <div className="shell">
                        <div className="jobs-results-heading">
                            <div>
                                <div className="eyebrow">
                                    <span className="eyebrow-rule" /> MORE TO
                                    CONSIDER
                                </div>
                                <h2 id="job-related-title">
                                    Similar openings.
                                </h2>
                            </div>
                            <a
                                className="text-link"
                                href={jobsIndex.url()}
                                data-testid="link-related-all-jobs"
                            >
                                See all jobs
                            </a>
                        </div>
                        <div className="jobs-list">
                            {related.map((item) => (
                                <JobListingCard
                                    key={item.id}
                                    job={item}
                                    isSaved={isSaved(item.id)}
                                    onToggleSaved={() => toggleSaved(item.id)}
                                    testId={`card-related-job-${item.id}`}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </>
    );
}
