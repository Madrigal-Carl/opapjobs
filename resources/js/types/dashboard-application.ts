export type ApplicationStageValue =
    | 'pending'
    | 'reviewed'
    | 'shortlisted'
    | 'interviewed'
    | 'hired';

export type DashboardApplicationRow = {
    id: number;
    stage: ApplicationStageValue;
    submitted_at: string;
    applicant_name: string;
    job_title: string;
    employer_name: string | null;
};

export type DashboardApplicationFilters = {
    q: string | null;
    stage: ApplicationStageValue | null;
    sort: 'newest' | 'oldest';
    per_page: number;
};

export type DashboardApplicationKpis = {
    total_applicants: number;
    new_today: number;
    reviewed: number;
    shortlisted: number;
};
