import {
    ArrowRight,
    BadgeCheck,
    Bookmark,
    Landmark,
    MapPin,
} from 'lucide-react';
import { AppLogo } from '@/components/site/app-logo';
import {
    CONFIDENTIAL_EMPLOYER_LABEL,
    getPublicEmployer,
    getPublicLocation,
    isManpooling,
} from '@/data/job-attributes';
import { cn } from '@/lib/utils';
import { show as jobShow } from '@/routes/jobs';
import type { Job } from '@/types/job';

type JobListingCardProps = {
    job: Job;
    isSaved: boolean;
    onToggleSaved: () => void;
    /** Adds the amber left rule used for the lead card on the home page. */
    featured?: boolean;
    /** Anchor target so the home page can deep-link into its job sections. */
    anchorId?: string;
    testId?: string;
};

/**
 * The listing card used on the home page.
 */
export function JobListingCard({
    job,
    isSaved,
    onToggleSaved,
    featured = false,
    anchorId,
    testId,
}: JobListingCardProps) {
    // Manpooling listings keep the company to themselves, exactly as the
    // agency-side preview shows.
    const publicEmployer = getPublicEmployer(job);

    return (
        <article
            className={cn('job-card', featured && 'job-card-featured')}
            id={anchorId}
            data-testid={testId}
        >
            <div className="job-main">
                <AppLogo className="job-company-logo" />
                <div>
                    <div className="job-card-flags">
                        <span className="job-type">
                            {job.pathway === 'landbased'
                                ? 'Landbased'
                                : 'Seabased'}
                        </span>
                        <span className="job-verified">
                            <BadgeCheck size={13} aria-hidden="true" /> Verified
                            opening
                        </span>
                        {isManpooling(job) && (
                            <span
                                className="job-verified job-verified-manpooling"
                                data-testid={`badge-manpooling-${job.id}`}
                            >
                                Manpooling
                            </span>
                        )}
                    </div>
                    <h3>{job.title}</h3>
                    <p
                        className="job-agency-line"
                        data-testid={`card-employer-${job.id}`}
                    >
                        <BadgeCheck size={13} aria-hidden="true" />{' '}
                        {publicEmployer ? (
                            <>DMW-accredited agency · {publicEmployer.name}</>
                        ) : (
                            <>
                                Posted by {job.agency} ·{' '}
                                {CONFIDENTIAL_EMPLOYER_LABEL.toLowerCase()}
                            </>
                        )}
                    </p>
                </div>
            </div>
            <div className="job-details">
                <span>
                    <MapPin size={15} aria-hidden="true" />{' '}
                    {getPublicLocation(job)}
                </span>
                <span>
                    <Landmark size={15} aria-hidden="true" /> {job.salary}
                </span>
                <span className="job-posted">{job.posted}</span>
            </div>
            <div className="job-action">
                <button
                    type="button"
                    className={cn('bookmark-button', isSaved && 'saved')}
                    onClick={onToggleSaved}
                    aria-label={
                        isSaved
                            ? `Remove ${job.title} from saved jobs`
                            : `Save ${job.title}`
                    }
                    aria-pressed={isSaved}
                    data-testid={`button-bookmark-${job.id}`}
                >
                    <Bookmark
                        size={19}
                        fill={isSaved ? 'currentColor' : 'none'}
                        aria-hidden="true"
                    />
                </button>
                <a
                    className="job-view-link"
                    href={jobShow.url(job.id)}
                    data-testid={`link-view-job-${job.id}`}
                >
                    View Job <ArrowRight size={17} aria-hidden="true" />
                </a>
            </div>
        </article>
    );
}
