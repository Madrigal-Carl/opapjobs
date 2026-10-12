import { jobs } from './jobs';
import type { Job } from '@/types/job';

let jobList: Job[] = [...jobs];

export function getJobList(): Job[] {
    return jobList;
}

export function addJob(job: Job): void {
    jobList = [job, ...jobList];
}
