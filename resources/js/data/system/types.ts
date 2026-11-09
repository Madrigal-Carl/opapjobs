import type { Pathway } from '@/types/agency';
import type { QuestionAnswerType } from '@/types/job';
export type { QuestionAnswerType };

/**
 * Entity shapes for the Super Admin console.
 *
 * These mirror `docs/database.md` column for column. Where the doc says a
 * value is derived rather than stored (a job post's display status, an
 * Agency's rating or job-post count) it is computed by a selector instead
 * of sitting on the record — see the "not stored" notes in §4.
 *
 * The enum-valued types below use the **stored** values from §6.1. The
 * pre-existing `types/application.ts`, `types/applicant.ts` and
 * `types/applicant-profile.ts` model the older UI *labels* ("Reviewed",
 * "Available now"); docs §12.1 declares those reference-only, so the console
 * speaks the stored values and maps to labels at the edge.
 */

export type ApplicationStage =
    | 'applied'
    | 'reviewed'
    | 'interview'
    | 'hired'
    | 'pending';

export const APPLICATION_STAGES: ApplicationStage[] = [
    'applied',
    'reviewed',
    'interview',
    'hired',
    'pending',
];

export const APPLICATION_STAGE_LABELS: Record<ApplicationStage, string> = {
    applied: 'Applied',
    reviewed: 'Reviewed',
    interview: 'Interview',
    hired: 'Hired',
    pending: 'Pending',
};

export type Availability =
    | 'immediately'
    | 'within_2_weeks'
    | 'within_1_month'
    | 'more_than_1_month';

export const AVAILABILITY_LABELS: Record<Availability, string> = {
    immediately: 'Immediately',
    within_2_weeks: 'Within 2 weeks',
    within_1_month: 'Within 1 month',
    more_than_1_month: 'More than 1 month',
};

export type DocumentType = 'resume' | 'certificate' | 'passport' | 'other';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
    resume: 'Resume',
    certificate: 'Certificate',
    passport: 'Passport',
    other: 'Other',
};

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    expert: 'Expert',
};

/** Every archivable table soft-deletes; `job_posts` archives via `status`. */
export type Archived = {
    deletedAt: string | null;
};

export type AgencyRecord = {
    id: number;
    slug: string;
    agencyName: string;
    pathway: Pathway;
    dmwLicenseNumber: string;
    /** Free text written by each Agency — deliberately not a lookup (§7.2). */
    agencySize: string | null;
    headquartersCity: string;
    about: string | null;
    logoPath: string | null;
    yearEstablished: number | null;
    publicPhone: string | null;
    publicEmail: string | null;
    publicAddress: string | null;
    facebookUrl: string | null;
    instagramUrl: string | null;
    xUrl: string | null;
    websiteUrl: string | null;
    verifiedAt: string | null;
    /** Cap on `agency` accounts. The admin does not count (§2.2). */
    agencyUserLimit: number;
    adminUserId: number | null;
    suspendedAt: string | null;
    createdByUserId: number;
    deletedAt: string | null;
    createdAt: string;
};

export type UserRole = 'superadmin' | 'admin' | 'agency' | 'applicant';

export type UserRecord = {
    id: number;
    name: string;
    email: string;
    emailVerifiedAt: string | null;
    role: UserRole;
    /** Required for `admin` and `agency`; NULL for applicant/superadmin (§7.1). */
    agencyId: number | null;
    createdByUserId: number | null;
    suspendedAt: string | null;
    /** Seed-only affordance so the list can show "last active". */
    lastActiveAt: string | null;
    deletedAt: string | null;
    createdAt: string;
};

export type RecruitmentType = 'joborder' | 'manpooling';
export type ContractType = 'permanent' | 'fixed' | 'seasonal';
export type EducationLevel = 'secondary' | 'vocational' | 'bachelor' | 'master';
export type GenderRequirement = 'any' | 'male' | 'female';

/** Stored `job_posts.status` (§8.2). `active` / `expired` are derived. */
export type JobPostStatus = 'pending' | 'closed' | 'archived';

export type JobPostLanguage = {
    language: string;
    proficiency: string;
};

export type JobPostRecord = {
    id: number;
    agencyId: number;
    postedByUserId: number;
    recruitmentType: RecruitmentType;
    jobTitle: string;
    jobSubcategoryId: number;
    workLocation: string;
    vacantPositions: number;
    contractType: ContractType;
    salaryCurrency: string | null;
    monthlySalaryMin: number | null;
    monthlySalaryMax: number | null;
    educationLevel: EducationLevel;
    minExperienceYears: number | null;
    maxExperienceYears: number | null;
    genderRequirement: GenderRequirement;
    /** Plain text with lightweight markup, never HTML, max 20,000 (§4.1). */
    jobDescription: string;
    otherRequirements: string | null;
    applicationInstructions: string | null;
    contactPersonName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    status: JobPostStatus;
    closingDate: string | null;
    isUrgent: boolean;
    languages: JobPostLanguage[];
    createdAt: string;
    updatedAt: string;
};

export type JobPostQuestionRecord = {
    id: number;
    jobPostId: number;
    questionText: string;
    answerType: QuestionAnswerType;
    expectedAnswer: string | null;
    options?: string[];
    isRequired: boolean;
    sortOrder: number;
    /** Drives the §8.4 rule: an answered question is archived, never edited. */
    answerCount: number;
    deletedAt: string | null;
};

export type ApplicationRecord = {
    id: number;
    jobPostId: number;
    applicantUserId: number;
    resumeDocumentId: number | null;
    coverLetter: string | null;
    expectedMonthlySalary: number | null;
    availability: Availability | null;
    stage: ApplicationStage;
    submittedAt: string;
    applicantArchivedAt: string | null;
};

export type ApplicationStageHistoryRecord = {
    id: number;
    applicationId: number;
    fromStage: ApplicationStage | null;
    toStage: ApplicationStage;
    changedByUserId: number | null;
    note: string | null;
    createdAt: string;
};

export type ApplicationAnswerRecord = {
    id: number;
    applicationId: number;
    jobPostQuestionId: number;
    answerText: string;
};

export type ApplicantProfileRecord = {
    userId: number;
    headline: string | null;
    phoneNumber: string | null;
    currentLocation: string | null;
    avatarPath: string | null;
    professionalSummary: string | null;
    defaultCoverLetter: string | null;
    /** Candidate-directory visibility; frontend name today: `visibleToEmployers`. */
    isVisibleToAgencies: boolean;
    availability: Availability | null;
    preferredPathway: Pathway | null;
};

export type ApplicantExperienceRecord = {
    id: number;
    applicantUserId: number;
    jobRole: string;
    companyName: string;
    startedOn: string;
    /** null = current. */
    endedOn: string | null;
    workLocation: string;
    responsibilities: string;
    sortOrder: number;
};

export type ApplicantEducationRecord = {
    id: number;
    applicantUserId: number;
    schoolName: string;
    degree: string;
    fieldOfStudy: string;
    startedOn: string;
    endedOn: string | null;
    sortOrder: number;
};

export type ApplicantCertificationRecord = {
    id: number;
    applicantUserId: number;
    certificationName: string;
    issuingOrganization: string;
    issuedOn: string | null;
    expiresOn: string | null;
    credentialUrl: string | null;
    sortOrder: number;
};

export type ApplicantSkillRecord = {
    id: number;
    applicantUserId: number;
    skillName: string;
    skillLevel: SkillLevel;
    sortOrder: number;
};

export type ApplicantDocumentRecord = {
    id: number;
    applicantUserId: number;
    documentType: DocumentType;
    originalFileName: string;
    storagePath: string;
    mimeType: string;
    fileSizeBytes: number;
    /** One primary resume per applicant (§9.3). */
    isPrimary: boolean;
    uploadedAt: string;
    deletedAt: string | null;
};

export type AgencyReviewRecord = {
    id: number;
    agencyId: number;
    applicantUserId: number;
    rating: number;
    reviewText: string | null;
    /** Set when a moderator edits the text (§4.7 of the console spec). */
    editedByModeratorAt: string | null;
    deletedAt: string | null;
    createdAt: string;
};

export type JobCategoryRecord = {
    id: number;
    pathway: Pathway;
    categoryName: string;
    sortOrder: number;
    deletedAt: string | null;
};

export type JobSubcategoryRecord = {
    id: number;
    jobCategoryId: number;
    subcategoryName: string;
    sortOrder: number;
    deletedAt: string | null;
};

/** One row of an editable option list (§4.10 tab 1). */
export type OptionRecord = {
    /** Stable key persisted in the row; locked while the option is in use. */
    value: string;
    label: string;
    active: boolean;
    sortOrder: number;
    /** True once any record uses `value`; locks the stored value. */
    inUse: boolean;
    /** Application stages only: the `StatusPill` tone shown in tables. */
    tone?: string;
};

export type OptionListKey =
    | 'contract_types'
    | 'education_levels'
    | 'currencies'
    | 'languages'
    | 'language_proficiency'
    | 'gender_requirement'
    | 'recruitment_types'
    | 'application_stages'
    | 'availability'
    | 'skill_levels'
    | 'document_types'
    | 'question_answer_types'
    | 'destination_countries'
    | 'country_dial_codes';

export type OptionListState = Record<OptionListKey, OptionRecord[]>;

/** Which screen a configured field belongs to. */
export type FormFieldOwner =
    | 'job_post'
    | 'agency_profile'
    | 'applicant_profile'
    | 'application';

export type FormFieldRecord = {
    id: string;
    owner: FormFieldOwner;
    /** Form order; the list is rendered and reordered on this. */
    sortOrder: number;
    label: string;
    helpText: string;
    placeholder: string;
    section: string;
    required: boolean;
    visible: boolean;
    /** System fields keep their type and key; only presentation is editable. */
    isSystem: boolean;
    /** Locked for system fields; shown with a lock and a reason tooltip. */
    type: string;
    key: string;
    /** Custom fields only: the options of a select field. */
    options?: string[];
};

/** A superadmin-defined field added to one of the four forms (§4.10 tab 3). */
export type CustomFieldRecord = {
    id: string;
    owner: FormFieldOwner;
    label: string;
    /** Auto-generated, then locked so stored answers keep their key. */
    key: string;
    type:
        | 'short_text'
        | 'paragraph'
        | 'number'
        | 'date'
        | 'yes_no'
        | 'single_select'
        | 'multi_select';
    options: string[];
    required: boolean;
    visible: boolean;
    helpText: string;
    /** Where the field sits in its form. */
    section: string;
    sortOrder: number;
};

export type SiteContentState = {
    announcement: {
        enabled: boolean;
        text: string;
        link: string;
    };
    homeHero: {
        headline: string;
        subtext: string;
        primaryCta: string;
        secondaryCta: string;
    };
    homeStats: { label: string; value: string }[];
    homeResources: {
        id: string;
        icon: string;
        eyebrow: string;
        title: string;
        body: string;
        link: string;
    }[];
    contactDesks: {
        id: string;
        label: string;
        email: string;
        phone: string;
        blurb: string;
    }[];
    footerLinks: { id: string; label: string; href: string }[];
    socialUrls: {
        facebook: string;
        instagram: string;
        x: string;
        website: string;
    };
};

export type SettingsState = {
    platformName: string;
    supportEmail: string;
    defaultAgencyUserLimit: number;
    documentQuota: {
        maxFiles: number;
        maxFileSizeMb: number;
        allowedTypes: string[];
    };
    applicantSignupOpen: boolean;
    maintenanceBanner: string | null;
};

/** Subject kinds an audit row can point at. */
export type AuditSubjectType =
    | 'agency'
    | 'user'
    | 'job_post'
    | 'application'
    | 'applicant'
    | 'review'
    | 'category'
    | 'subcategory'
    | 'option'
    | 'form_field'
    | 'custom_field'
    | 'content'
    | 'settings';

/** One field-level change, rendered as a before/after diff. */
export type AuditChange = {
    field: string;
    from: string | number | boolean | null;
    to: string | number | boolean | null;
};

export type AuditEntry = {
    id: string;
    /** Seed-only affordance so seeded rows are not all "just now". */
    createdAt: string;
    actorUserId: number;
    action: string;
    subjectType: AuditSubjectType;
    subjectId: number | string;
    /** Human label for the subject, kept on the row so history reads well. */
    subjectLabel: string;
    changes: AuditChange[];
    ipAddress: string;
};

export type { Pathway };
