import { Head, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BadgeCheck,
    Building2,
    Check,
    Info,
    Mail,
    Phone,
    ShieldCheck,
    User,
} from 'lucide-react';
import { JobDetailPanel } from '@/components/applicant/job-detail-panel';
import { JobListingCard } from '@/components/site/job-listing-card';
import { ApplicantScope } from '@/components/applicant/applicant-scope';
import { JobNotFound } from '@/components/applicant/job-not-found';
import { useApplications } from '@/contexts/applications-context';
import { findAgency } from '@/data/agency-lookup';
import {
    getEffectiveStatus,
    getPublicEmployer,
    isManpooling,
} from '@/data/job-attributes';
import { getRelatedJobs } from '@/data/job-browse';
import { getJobList } from '@/data/job-store';
import { login, applications } from '@/routes';
import { apply as jobApply, index as jobsIndex } from '@/routes/jobs';
import type { Job } from '@/types/job';

type JobShowProps = {
    jobId: string;
};

/**
 * The full listing.
 *
 * The browse page previews a job in a sticky column; this page is the same
 * panel given room to breathe, plus the agency behind it and the roles
 * either side. It is the page a shared link resolves to, so it has to be
 * readable on its own with no list in view.
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

    const status = getEffectiveStatus(job);
    const isClosed = status === 'closed';

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
    const publicEmployer = getPublicEmployer(job);
    const related = getRelatedJobs(job);

    return (
        <>
            <Head>
                <title>{`${job.title} — ${job.agency} | OPAP Job Abroad`}</title>
                <meta
                    name="description"
                    content={`${job.title} in ${job.employerLocation}. ${job.description ?? ''}`.slice(
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

            {(job.contactName ||
                job.contactEmail ||
                job.contactPhone ||
                agency ||
                publicEmployer?.poeaLicenseNo) && (
                <section className="job-contact-section">
                    <div className="shell">
                        <div className="job-contact-grid">
                            <div className="job-contact-card">
                                <div className="eyebrow">
                                    <span className="eyebrow-rule" /> THE AGENCY
                                    BEHIND THIS VACANCY
                                </div>
                                <h2>
                                    {agency?.name ?? job.agency}
                                    {agency && (
                                        <span className="job-contact-rating">
                                            <BadgeCheck
                                                size={14}
                                                aria-hidden="true"
                                            />{' '}
                                            {agency.rating} rating
                                        </span>
                                    )}
                                </h2>
                                <p className="job-contact-lede">
                                    {agency?.description ??
                                        'Your application is handled by the accredited agency that posted this role.'}
                                </p>
                                {publicEmployer && (
                                    <dl className="job-contact-facts">
                                        <div>
                                            <dt>
                                                <Building2
                                                    size={14}
                                                    aria-hidden="true"
                                                />{' '}
                                                Employer
                                            </dt>
                                            <dd>{publicEmployer.name}</dd>
                                        </div>
                                        <div>
                                            <dt>
                                                <ShieldCheck
                                                    size={14}
                                                    aria-hidden="true"
                                                />{' '}
                                                Licence
                                            </dt>
                                            <dd>
                                                {publicEmployer.poeaLicenseNo}
                                            </dd>
                                        </div>
                                    </dl>
                                )}
                                {agency && (
                                    <a
                                        className="job-detail-agency-cta"
                                        href={`/agency/${agency.slug}`}
                                        data-testid={`link-job-agency-${job.id}`}
                                    >
                                        View the agency profile
                                    </a>
                                )}
                            </div>

                            {(job.contactName ||
                                job.contactEmail ||
                                job.contactPhone) && (
                                <div className="job-contact-card">
                                    <div className="eyebrow">
                                        <span className="eyebrow-rule" /> HOW TO
                                        REACH THEM
                                    </div>
                                    <h3 className="job-contact-person">
                                        {job.contactName && (
                                            <>
                                                <User
                                                    size={15}
                                                    aria-hidden="true"
                                                />{' '}
                                                {job.contactName}
                                            </>
                                        )}
                                    </h3>
                                    <ul className="job-contact-list">
                                        {job.contactEmail && (
                                            <li>
                                                <Mail
                                                    size={14}
                                                    aria-hidden="true"
                                                />{' '}
                                                <a
                                                    href={`mailto:${job.contactEmail}`}
                                                >
                                                    {job.contactEmail}
                                                </a>
                                            </li>
                                        )}
                                        {job.contactPhone && (
                                            <li>
                                                <Phone
                                                    size={14}
                                                    aria-hidden="true"
                                                />{' '}
                                                <a
                                                    href={`tel:${job.contactPhone.replaceAll(
                                                        ' ',
                                                        '',
                                                    )}`}
                                                >
                                                    {job.contactPhone}
                                                </a>
                                            </li>
                                        )}
                                    </ul>
                                    <p className="job-contact-note">
                                        Send the agency a message if anything in
                                        the listing is unclear. Applying through
                                        this page keeps your application on
                                        record.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {related.length > 0 && (
                <section className="job-related-section">
                    <div className="shell">
                        <div className="jobs-results-heading">
                            <div>
                                <div className="eyebrow">
                                    <span className="eyebrow-rule" /> MORE
                                    OPENINGS
                                </div>
                                <h2>
                                    Roles you might
                                    <br />
                                    <em>consider next.</em>
                                </h2>
                            </div>
                            <a
                                className="job-detail-agency-cta"
                                href={jobsIndex.url()}
                            >
                                Browse all jobs
                            </a>
                        </div>

                        <div className="job-related-grid">
                            {related.map((item) => (
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
