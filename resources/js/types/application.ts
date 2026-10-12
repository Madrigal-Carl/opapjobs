export type ApplicationStage =
    | 'Applied'
    | 'Reviewed'
    | 'Interview'
    | 'Hired'
    | 'Pending';

export type Application = {
    id: number;
    applicantId: number;
    jobId: string;
    stage: ApplicationStage;
    appliedAt: string;
};
