import type { PostingType } from '@/types/job';

export type JobPostDisplayStatus = 'active' | 'expired' | 'closed' | 'archived';
export type JobPostSort =
    | 'newest'
    | 'oldest'
    | 'expiring'
    | 'applicants'
    | 'salary';

export type JobPostRow = {
    id: number;
    job_title: string;
    work_location: string;
    created_at: string;
    closing_date: string | null;
    salary_currency: string | null;
    monthly_salary_min: string | null;
    monthly_salary_max: string | null;
    recruitment_type: PostingType;
    display_status: JobPostDisplayStatus;
    applicants_count: number;
    hired_count: number;
    vacant_positions: number;
    is_urgent: boolean;
};

export type JobPostIndexFilters = {
    q: string | null;
    status: JobPostDisplayStatus | null;
    recruitment_type: PostingType | null;
    sort: JobPostSort;
    per_page: number;
};

export type JobPostKpis = {
    active_jobs: number;
    total_applicants: number;
    with_job_order: number;
    successful_placements: number;
};
