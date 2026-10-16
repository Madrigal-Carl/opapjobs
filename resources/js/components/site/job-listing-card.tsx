import {
    ArrowRight,
    BadgeCheck,
    Bookmark,
    Landmark,
    MapPin,
} from 'lucide-react';
import { AppLogo } from '@/components/site/app-logo';
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
 * The listing card used on the home page and on My Jobs.
 */
export function JobListingCard({
    job,
    isSaved,
    onToggleSaved,
    featured = false,
    anchorId,
    testId,
}: JobListingCardProps) {
    return (
        <article
            className={`job-card ${featured ? 'job-card-featured' : ''}`}
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
                            <BadgeCheck size={13} /> Verified opening
                        </span>
                    </div>
                    <h3>{job.title}</h3>
                    <p className="job-agency-line">
                        <BadgeCheck size={13} /> DMW-accredited agency ·{' '}
                        {job.employer}
                    </p>
                </div>
            </div>
            <div className="job-details">
                <span>
                    <MapPin size={15} /> {job.location}
                </span>
                <span>
                    <Landmark size={15} /> {job.salary}
                </span>
                <span className="job-posted">{job.posted}</span>
            </div>
            <div className="job-action">
                <button
                    type="button"
                    className={`bookmark-button ${isSaved ? 'saved' : ''}`}
                    onClick={onToggleSaved}
                    aria-label={
                        isSaved
                            ? `Remove ${job.title} from saved jobs`
                            : `Save ${job.title}`
                    }
                    aria-pressed={isSaved}
                    data-testid={`button-bookmark-${job.id}`}
                >
                    {isSaved ? (
                        <Bookmark size={19} fill="currentColor" />
                    ) : (
                        <Bookmark size={19} />
                    )}
                </button>
                <a
                    className="job-view-link"
                    href={`/job/${job.id}`}
                    data-testid={`link-view-job-${job.id}`}
                >
                    View Job <ArrowRight size={17} />
                </a>
            </div>
        </article>
    );
}
