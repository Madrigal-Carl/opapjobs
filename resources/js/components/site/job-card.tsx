import { BadgeCheck, Bookmark, Clock3, Landmark, MapPin } from 'lucide-react';
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

type JobCardProps = {
    job: Job;
    isSelected: boolean;
    isSaved: boolean;
    onSelect: () => void;
    onToggleSaved: () => void;
    testId: string;
};

/**
 * The selectable job row used on agency profiles and in the jobs browser.
 */
export function JobCard({
    job,
    isSelected,
    isSaved,
    onSelect,
    onToggleSaved,
    testId,
}: JobCardProps) {
    // Manpooling listings keep the company to themselves, exactly as the
    // agency-side preview shows.
    const publicEmployer = getPublicEmployer(job);
    const hidden = !publicEmployer;

    return (
        // The card is a plain container: it is not focusable and carries no
        // role, because the title link and the bookmark are already controls
        // inside it and nesting a button around them breaks both. The click
        // handler on the container is only a shortcut for the title link.
        <article
            className={cn('jobs-list-card', isSelected && 'is-selected')}
            data-testid={testId}
            onClick={onSelect}
        >
            <div className="jobs-list-card-main">
                <AppLogo className="job-company-logo" />
                <div className="jobs-list-card-copy">
                    <div className="job-card-flags">
                        <span className="job-type">
                            {job.pathway === 'landbased'
                                ? 'Landbased'
                                : 'Seabased'}
                        </span>
                        {job.featured && (
                            <span className="jobs-card-label">Featured</span>
                        )}
                        {job.urgent && (
                            <span className="jobs-card-label urgent">
                                Urgent
                            </span>
                        )}
                        {job.recent && (
                            <span className="jobs-card-label">New</span>
                        )}
                        {isManpooling(job) && (
                            <span
                                className="jobs-card-label"
                                data-testid={`badge-manpooling-${job.id}`}
                            >
                                Manpooling
                            </span>
                        )}
                    </div>
                    <h3>
                        {/* The single tab stop for the card. It stays a real
                            link so the listing can be opened in a new tab,
                            while a normal click runs the page's selection. */}
                        <a
                            href={jobShow.url(job.id)}
                            aria-current={isSelected ? 'true' : undefined}
                            onClick={(event) => {
                                event.stopPropagation();
                                onSelect();
                            }}
                            data-testid={`link-card-job-${job.id}`}
                        >
                            {job.title}
                        </a>
                    </h3>
                    <p className="jobs-card-agency">
                        <BadgeCheck size={13} aria-hidden="true" /> {job.agency}
                    </p>
                    <p
                        className={
                            hidden
                                ? 'jobs-card-employer is-hidden'
                                : 'jobs-card-employer'
                        }
                        data-testid={`card-employer-${job.id}`}
                    >
                        {publicEmployer
                            ? publicEmployer.name
                            : CONFIDENTIAL_EMPLOYER_LABEL}
                    </p>
                </div>
            </div>
            <div className="jobs-list-card-meta">
                <span className="jobs-card-salary">
                    <Landmark size={14} aria-hidden="true" /> {job.salary}
                </span>
                <span>
                    <MapPin size={14} aria-hidden="true" />{' '}
                    {getPublicLocation(job)}
                </span>
                <span>
                    <Clock3 size={14} aria-hidden="true" /> {job.posted}
                </span>
            </div>
            <button
                type="button"
                className={`bookmark-button jobs-card-bookmark ${isSaved ? 'saved' : ''}`}
                onClick={(event) => {
                    event.stopPropagation();
                    onToggleSaved();
                }}
                aria-label={
                    isSaved
                        ? `Remove ${job.title} from saved jobs`
                        : `Save ${job.title}`
                }
                aria-pressed={isSaved}
                data-testid={`button-bookmark-${job.id}`}
            >
                <Bookmark
                    size={18}
                    fill={isSaved ? 'currentColor' : 'none'}
                    aria-hidden="true"
                />
            </button>
        </article>
    );
}
