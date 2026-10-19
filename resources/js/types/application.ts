export type ApplicationStage =
    | 'Pending'
    | 'Under review'
    | 'Shortlisted'
    | 'Interviewed'
    | 'Hired';

export type Application = {
    id: number;
    applicantId: number;
    jobId: string;
    stage: ApplicationStage;
    appliedAt: string;
};
