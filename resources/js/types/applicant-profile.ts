/**
 * Applicant-side resume shapes.
 *
 * These are deliberately separate from `types/applicant.ts`, which models the
 * candidate records an agency reviews inside the dashboard. Nothing here is
 * written by the employer side.
 */

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export const SKILL_LEVELS: SkillLevel[] = [
    'Beginner',
    'Intermediate',
    'Advanced',
    'Expert',
];

/** How many of the four level dots a skill fills. */
export const SKILL_LEVEL_DOTS: Record<SkillLevel, number> = {
    Beginner: 1,
    Intermediate: 2,
    Advanced: 3,
    Expert: 4,
};

export type ResumeExperience = {
    id: string;
    role: string;
    company: string;
    start: string;
    /** Empty while the applicant is still in the role. */
    end: string;
    location: string;
    description: string;
};

export type ResumeEducation = {
    id: string;
    school: string;
    degree: string;
    field: string;
    start: string;
    end: string;
};

export type ResumeCertification = {
    id: string;
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate: string;
    credentialUrl: string;
};

export type ResumeSkill = {
    id: string;
    name: string;
    level: SkillLevel;
};

export type ResumeDocument = {
    id: string;
    name: string;
    uploadedAt: string;
    size: string;
    /** Empty for mocked documents that have no file behind them. */
    url: string;
    primary: boolean;
};

export type ApplicantProfile = {
    name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    avatarUrl: string;
    summary: string;
    visibleToEmployers: boolean;
    experiences: ResumeExperience[];
    education: ResumeEducation[];
    certifications: ResumeCertification[];
    skills: ResumeSkill[];
    documents: ResumeDocument[];
    coverLetter: string;
};

/** The signed-in Inertia user, narrowed to what the mock profile needs. */
export type ProfileOwner = {
    name: string;
    email: string;
    avatar?: string;
};

/** Sections counted when working out resume completeness. */
export const RESUME_COMPLETENESS_FIELDS = [
    'summary',
    'experiences',
    'education',
    'certifications',
    'skills',
    'documents',
] as const;
