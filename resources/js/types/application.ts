import type {
    ResumeCertification,
    ResumeDocument,
    ResumeEducation,
    ResumeExperience,
    ResumeSkill,
} from '@/types/applicant-profile';
import type { ApplicationAnswer } from '@/types/application-draft';
import type { Availability } from '@/types/applicant';

export type ApplicationStage =
    | 'Pending'
    | 'Reviewed'
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

export type ApplicationDetail = {
    email: string;
    phone: string;
    headline: string;
    summary: string;
    experiences: ResumeExperience[];
    education: ResumeEducation[];
    certifications: ResumeCertification[];
    skills: ResumeSkill[];
    documents: ResumeDocument[];
    resumeId: string;
    coverLetter: string;
    expectedSalary: string;
    availability: Availability;
    answers: Record<string, ApplicationAnswer>;
};
