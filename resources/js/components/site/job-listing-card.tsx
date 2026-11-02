import {
    ArrowRight,
    BadgeCheck,
    Bookmark,
    Landmark,
    MapPin,
} from 'lucide-react';
import { AppLogo } from '@/components/site/app-logo';
import { CONFIDENTIAL_EMPLOYER_LABEL } from '@/lib/public-catalog';
import { cn } from '@/lib/utils';
import { show as jobShow } from '@/routes/jobs';
import type { PublicJobPostCard } from '@/types/public-catalog';

type JobListingCardProps = {
    job: PublicJobPostCard;
    isSaved: boolean;
    onToggleSaved: () => void;
    /** Adds the amber left rule used for the lead card on the home page (positional only). */
    highlighted?: boolean;
    /** Anchor target so the home page can deep-link into its job sections. */
    anchorId?: string;
    testId?: string;
};

/**
 * The job post card used on the home page and the job profile.
 */
export function JobListingCard({
    job,
    isSaved,
    onToggleSaved,
    highlighted = false,
    anchorId,
    testId,
}: JobListingCardProps) {
    return (
        <article
            className={cn('job-card', highlighted && 'job-card-featured')}
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
                        {job.employerHidden && (
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
                        {!job.employerHidden && job.employer ? (
                            <>DMW-accredited agency · {job.employer}</>
                        ) : job.employerHidden ? (
                            <>
                                Posted by {job.agency} ·{' '}
                                {CONFIDENTIAL_EMPLOYER_LABEL.toLowerCase()}
                            </>
                        ) : (
                            <>Posted by {job.agency}</>
                        )}
                    </p>
                </div>
            </div>
            <div className="job-details">
                <span>
                    <MapPin size={15} aria-hidden="true" /> {job.location}
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
