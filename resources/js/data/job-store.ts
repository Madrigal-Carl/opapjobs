import { findSimilarListing, getEffectiveStatus } from './job-attributes';
import { jobs } from './jobs';
import type { Job, ListingStatus } from '@/types/job';

let jobList: Job[] = [...jobs];

export function getJobList(): Job[] {
    return jobList;
}

export function addJob(job: Job): void {
    jobList = [job, ...jobList];
}

export function getJobById(id: string): Job | undefined {
    return jobList.find((job) => job.id === id);
}

/**
 * Publishes a listing, or leaves it as a draft. The admin never picks
 * a "closed" state: that follows from the closing date.
 */
export function setJobStatus(id: string, status: ListingStatus): void {
    jobList = jobList.map((job) => (job.id === id ? { ...job, status } : job));
}

/**
 * Stops a listing before its closing date, for example once the role
 * is filled. Reopening clears the marker and, if the closing date has
 * already passed, pushes it out so the listing does not immediately
 * close again.
 */
export function closeJob(id: string, closedEarly = true): void {
    jobList = jobList.map((job) =>
        job.id === id ? { ...job, closedEarly } : job,
    );
}

export function reopenJob(id: string, newClosingDate?: string): void {
    jobList = jobList.map((job) => {
        if (job.id !== id) {
            return job;
        }

        return {
            ...job,
            status: 'published',
            closedEarly: false,
            closingDate: newClosingDate ?? job.closingDate,
        };
    });
}

export function getJobEffectiveStatus(id: string) {
    const job = getJobById(id);

    return job ? getEffectiveStatus(job) : 'closed';
}

/**
 * Existing listings that look like the one being drafted, so an admin
 * can catch the same role being posted twice.
 */
export function findSimilarJob(
    candidate: Pick<Job, 'employer' | 'title' | 'category'>,
): Job[] {
    return findSimilarListing(candidate, jobList);
}
