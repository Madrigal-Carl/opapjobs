import type { ReactNode } from 'react';
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
    Ship,
    Star,
    Zap,
} from 'lucide-react';
import { findAgency } from '@/data/agency-lookup';
import {
    CONFIDENTIAL_EMPLOYER_LABEL,
    POSTING_TYPE_LABELS,
    closingLabel,
    closingUrgencyLabel,
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
     * already is the page — and set on the browse split view, where the panel
     * is a preview and needs a way out.
     */
    viewAllHref?: string;
    /**
     * Rendered as a bordered band directly under the header, above the
     * description. On the full listing this is the "Listed by" agency
     * summary; the browse preview omits it because the header there already
     * links to the agency.
     */
    listedBy?: ReactNode;
};

/**
 * The long-form view of a listing. On the jobs page it sits in the sticky
 * right column and links through to the full page; on the job detail page it
 * is the page body.
 */
export function JobDetailPanel({
    job,
    isSaved,
    onToggleSaved,
    applyHref,
    isApplied = false,
    isClosed = false,
    viewAllHref,
    listedBy,
}: JobDetailPanelProps) {
    const agency = findAgency(job.agency);
    const publicEmployer = getPublicEmployer(job);
    // Only worth saying when the window is short enough to change a plan.
    const urgency = closingUrgencyLabel(job.closingDate);
    /**
     * The preview sits inside a page that already has a heading, so it stays
     * an `h2`. On the listing page the panel *is* the page, so it takes the
     * `h1` — otherwise that page has no top-level heading at all.
     */
    const Heading = viewAllHref ? 'h2' : 'h1';

    return (
        <article
            className="job-detail-panel"
            data-testid={`panel-job-detail-${job.id}`}
        >
            <div className="job-detail-sticky-top">
                <header className="job-detail-header">
                    <div className="job-detail-badges">
                        <span
                            className={`job-pathway-pill is-${job.pathway}`}
                            data-testid={`badge-pathway-${job.id}`}
                        >
                            {job.pathway === 'landbased' ? (
                                <Building2 size={13} aria-hidden="true" />
                            ) : (
                                <Ship size={13} aria-hidden="true" />
                            )}
                            {job.pathway === 'landbased'
                                ? 'Landbased'
                                : 'Seabased'}
                        </span>

                        {job.featured && (
                            <span className="job-flag-pill is-featured">
                                Featured
                            </span>
                        )}

                        {job.urgent && (
                            <span
                                className="job-flag-pill is-urgent"
                                data-testid={`badge-urgent-${job.id}`}
                            >
                                <Zap
                                    size={13}
                                    fill="currentColor"
                                    aria-hidden="true"
                                />{' '}
                                Urgent hiring
                            </span>
                        )}

                        {!job.urgent && (
                            <span
                                className="job-flag-pill"
                                data-testid={`badge-posting-type-${job.id}`}
                            >
                                {POSTING_TYPE_LABELS[job.postingType]}
                            </span>
                        )}
                    </div>

                    {/* Title and actions share a row: the reference keeps the
                        Apply button on the title's baseline, so the decision
                        and the thing it is about are seen at once. */}
                    <div className="job-detail-title-row">
                        <div className="job-detail-title-group">
                            <Heading className="job-detail-title">
                                {job.title}
                            </Heading>
                            <p
                                className={`job-detail-employer ${
                                    publicEmployer ? '' : 'is-hidden'
                                }`}
                                data-testid={`detail-employer-${job.id}`}
                            >
                                {publicEmployer
                                    ? publicEmployer.name
                                    : CONFIDENTIAL_EMPLOYER_LABEL}
                            </p>

                            {/* The agency is named in the "Listed by" band on
                                the full listing. The preview has no such
                                band, so it credits the agency here instead. */}
                            {!listedBy && (
                                <p className="job-detail-agency">
                                    <BadgeCheck size={15} aria-hidden="true" />{' '}
                                    <a href={agencyShow.url(job.agency)}>
                                        {job.agency}
                                    </a>
                                    {agency && (
                                        <span className="job-detail-agency-rating">
                                            <Star
                                                size={13}
                                                fill="currentColor"
                                                aria-hidden="true"
                                            />{' '}
                                            {agency.rating}
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>

                        <div className="job-detail-actions">
                            {isApplied ? (
                                <span
                                    className="jobs-apply-button is-applied"
                                    data-testid={`status-applied-${job.id}`}
                                >
                                    <Check size={15} aria-hidden="true" />{' '}
                                    Applied
                                </span>
                            ) : (
                                <a
                                    className="jobs-apply-button"
                                    href={applyHref}
                                    aria-disabled={isClosed}
                                    data-testid={`link-apply-${job.id}`}
                                >
                                    {isClosed
                                        ? 'No longer accepting'
                                        : 'Apply Now'}
                                    {!isClosed && (
                                        <ArrowRight
                                            size={16}
                                            aria-hidden="true"
                                        />
                                    )}
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
                                    size={18}
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
                        </div>
                    </div>

                    <div className="job-detail-meta" aria-label="Job details">
                        <span>
                            <MapPin size={18} aria-hidden="true" />
                            <span>
                                <strong>Location</strong>
                                {getPublicLocation(job)}
                            </span>
                        </span>
                        <span>
                            <Landmark size={18} aria-hidden="true" />
                            <span>
                                <strong>Salary</strong>
                                {job.salary}
                            </span>
                        </span>
                        <span>
                            <Clock3 size={18} aria-hidden="true" />
                            <span>
                                <strong>Posted</strong>
                                {job.posted}
                            </span>
                        </span>
                        <span>
                            <CalendarClock size={18} aria-hidden="true" />
                            <span>
                                <strong>Apply by</strong>
                                {closingLabel(job.closingDate)}
                                {urgency && (
                                    <em
                                        className="job-closing-soon"
                                        data-testid={`closing-soon-${job.id}`}
                                    >
                                        {urgency}
                                    </em>
                                )}
                            </span>
                        </span>
                    </div>
                </header>
            </div>

            {listedBy}

            <div className="job-detail-scroll-body">
                {job.description && (
                    <section className="job-detail-section">
                        <h3>Job description</h3>
                        <p>{job.description}</p>
                    </section>
                )}
                <section className="job-detail-section">
                    <h3>Key facts</h3>
                    {/* Location, salary and apply-by already sit in the meta
                        strip above, so they are dropped here rather than
                        repeated on one screen. This grid carries what the
                        agency captured as requirements — education, the
                        experience band, age, languages — because a listing
                        with no stated criteria is one an applicant cannot
                        measure themselves against. */}
                    <JobFacts job={job} omit={JOB_FACT_OVERVIEW} />
                </section>
                {job.benefits && job.benefits.length > 0 && (
                    <section className="job-detail-section">
                        <h3>Benefits</h3>
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
