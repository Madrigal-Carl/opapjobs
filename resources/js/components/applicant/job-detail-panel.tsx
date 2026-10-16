import {
    ArrowRight,
    BadgeCheck,
    Bookmark,
    Building2,
    CalendarClock,
    Check,
    Clock3,
    Landmark,
    MapPin,
    Star,
    Zap,
} from 'lucide-react';
import { findAgency } from '@/data/agency-lookup';
import {
    CONFIDENTIAL_EMPLOYER_LABEL,
    POSTING_TYPE_LABELS,
    getPublicEmployer,
    getPublicLocation,
} from '@/data/job-attributes';
import { show as agencyShow } from '@/routes/agencies';
import type { Job } from '@/types/job';
import { JOB_FACT_OVERVIEW, JobFacts } from './job-facts';

export type JobDetailPanelProps = {
    job: Job;
    isSaved: boolean;
    onToggleSaved: () => void;
    /** Where Apply points. Guests are sent to sign in first. */
    applyHref: string;
    /** True once the applicant has an application in for this listing. */
    isApplied?: boolean;
    /** Set when the listing is closed and can no longer receive applications. */
    isClosed?: boolean;
    /**
     * The full listing. Omitted on the listing page itself, where the panel
     * already is the page — and set on the browse split view, where the
     * panel is only a preview and needs a way out.
     */
    viewAllHref?: string;
    /** Extra actions rendered next to Apply. */
    children?: React.ReactNode;
};

/**
 * The long-form view of a listing. On the jobs page it sits in the sticky
 * right column and links through to the full page; on the job detail page it
 * is the whole page body.
 */
export function JobDetailPanel({
    job,
    isSaved,
    onToggleSaved,
    applyHref,
    isApplied = false,
    isClosed = false,
    viewAllHref,
    children,
}: JobDetailPanelProps) {
    const agency = findAgency(job.agency);
    const publicEmployer = getPublicEmployer(job);

    return (
        <article
            className="job-detail-panel"
            data-testid={`panel-job-detail-${job.id}`}
        >
            <div className="job-detail-sticky-top">
                <header className="job-detail-header">
                    <div className="job-detail-heading">
                        <div className="job-detail-kicker">
                            {job.pathway === 'landbased' ? (
                                <Building2 size={14} aria-hidden="true" />
                            ) : (
                                <span
                                    className="job-detail-ship-mark"
                                    aria-hidden="true"
                                >
                                    SB
                                </span>
                            )}
                            {job.pathway === 'landbased'
                                ? 'Landbased opening'
                                : 'Seabased opening'}
                        </div>
                        <h2>{job.title}</h2>
                        <div className="job-detail-agency-info">
                            <p className="job-detail-agency">
                                <BadgeCheck size={16} aria-hidden="true" />{' '}
                                <a href={agencyShow.url(job.agency)}>
                                    {job.agency}
                                </a>
                            </p>
                            <p
                                className={
                                    publicEmployer
                                        ? 'job-detail-employer'
                                        : 'job-detail-employer is-hidden'
                                }
                                data-testid={`detail-employer-${job.id}`}
                            >
                                {publicEmployer
                                    ? publicEmployer.name
                                    : CONFIDENTIAL_EMPLOYER_LABEL}
                            </p>
                            {agency && (
                                <p className="job-detail-agency-rating">
                                    <Star
                                        size={14}
                                        fill="currentColor"
                                        aria-hidden="true"
                                    />{' '}
                                    {agency.rating} agency rating ·{' '}
                                    {agency.license}
                                </p>
                            )}
                        </div>
                    </div>
                    {job.urgent ? (
                        <span className="job-urgency-badge">
                            <Zap
                                size={13}
                                fill="currentColor"
                                aria-hidden="true"
                            />{' '}
                            Urgent hiring
                        </span>
                    ) : (
                        <span
                            className="job-posting-badge"
                            data-testid={`badge-posting-type-${job.id}`}
                        >
                            {POSTING_TYPE_LABELS[job.postingType]}
                        </span>
                    )}
                </header>

                <div className="job-detail-meta" aria-label="Job details">
                    <span>
                        <MapPin size={16} aria-hidden="true" />
                        <strong>Location</strong>
                        {getPublicLocation(job)}
                    </span>
                    <span>
                        <Landmark size={16} aria-hidden="true" />
                        <strong>Salary</strong>
                        {job.salary}
                    </span>
                    <span>
                        <Clock3 size={16} aria-hidden="true" />
                        <strong>Posted</strong>
                        {job.posted}
                    </span>
                    <span>
                        <CalendarClock size={16} aria-hidden="true" />
                        <strong>Apply by</strong>
                        {job.closingDate ?? 'Open'}
                    </span>
                </div>

                <div className="job-detail-actions">
                    {isApplied ? (
                        <span
                            className="jobs-apply-button is-applied"
                            data-testid={`status-applied-${job.id}`}
                        >
                            <Check size={15} aria-hidden="true" /> Applied
                        </span>
                    ) : (
                        <a
                            className="jobs-apply-button"
                            href={applyHref}
                            aria-disabled={isClosed}
                            data-testid={`link-apply-${job.id}`}
                        >
                            {isClosed ? 'No longer accepting' : 'Apply Now'}
                        </a>
                    )}
                    <button
                        type="button"
                        className={`bookmark-button jobs-detail-bookmark ${isSaved ? 'saved' : ''}`}
                        onClick={onToggleSaved}
                        aria-label={
                            isSaved
                                ? `Remove ${job.title} from saved jobs`
                                : `Save ${job.title}`
                        }
                        aria-pressed={isSaved}
                        data-testid={`button-detail-bookmark-${job.id}`}
                    >
                        <Bookmark
                            size={19}
                            fill={isSaved ? 'currentColor' : 'none'}
                            aria-hidden="true"
                        />
                        <span>{isSaved ? 'Saved' : 'Save job'}</span>
                    </button>
                    {viewAllHref && (
                        <a
                            className="job-detail-view-all"
                            href={viewAllHref}
                            data-testid={`link-view-all-${job.id}`}
                        >
                            View full details
                            <ArrowRight size={15} aria-hidden="true" />
                        </a>
                    )}
                    {children}
                </div>
            </div>

            <div className="job-detail-scroll-body">
                {viewAllHref && (
                    <section className="job-detail-section">
                        <h3>Key facts</h3>
                        {/* The meta strip above already shows location,
                            salary and the closing date. */}
                        <JobFacts job={job} omit={JOB_FACT_OVERVIEW} />
                    </section>
                )}
                {job.description && (
                    <section className="job-detail-section">
                        <h3>About this role</h3>
                        <p>{job.description}</p>
                    </section>
                )}
                {job.benefits && job.benefits.length > 0 && (
                    <section className="job-detail-section">
                        <h3>What the employer offers</h3>
                        <ul>
                            {job.benefits.map((benefit) => (
                                <li key={benefit}>{benefit}</li>
                            ))}
                        </ul>
                    </section>
                )}
                {job.applyInstructions && (
                    <section className="job-detail-section">
                        <h3>How to apply</h3>
                        <p>{job.applyInstructions}</p>
                    </section>
                )}
            </div>
        </article>
    );
}
