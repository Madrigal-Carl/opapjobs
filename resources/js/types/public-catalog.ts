import type { Pathway } from './agency';
import type {
    ContractDuration,
    EducationLevel,
    GenderRequirement,
    LanguageProficiency,
    PostingType,
} from './job';

/**
 * Shapes sent by the server for the applicant-side pages. Every derived
 * value (rating, counts, Top Hirer, salary string, public location) is
 * computed on the server; manpooling job posts never carry the employer.
 */

export type PublicAgencyCard = {
    slug: string;
    name: string;
    location: string;
    mark: string;
    license: string;
    pathway: Pathway;
    /** Active job posts. */
    jobs: number;
    hiredCount: number;
    /** Average of non-archived reviews, one decimal; `null` with no reviews. */
    rating: number | null;
    reviewCount: number;
    verified: boolean;
    topHirer: boolean;
};

export type PublicAgencyListedBy = PublicAgencyCard & {
    description: string | null;
    yearsInOperation: number | null;
    size: string | null;
};

export type PublicAgencyProfile = PublicAgencyCard & {
    headquartersCity: string;
    about: string | null;
    yearEstablished: number | null;
    yearsInOperation: number | null;
    size: string | null;
    contact: {
        phone: string | null;
        email: string | null;
        address: string | null;
    };
    social: {
        facebook: string | null;
        instagram: string | null;
        x: string | null;
        website: string | null;
    };
};

export type PublicJobPostCard = {
    /** Numeric database id as a string, so `/job/{id}` matches the route. */
    id: string;
    title: string;
    agency: string;
    agencySlug: string;
    pathway: Pathway;
    /** What an applicant may read: the country only for manpooling. */
    location: string;
    salary: string;
    postedAt: string | null;
    posted: string;
    postingType: PostingType;
    /** True for manpooling: render the "Confidential employer" line. */
    employerHidden: boolean;
    employer: string | null;
    urgent: boolean;
    recent: boolean;
    category: string | null;
    subCategory: string | null;
    closingDate: string | null;
    vacantPositions: number;
};

export type PublicJobPostLanguage = {
    language: string;
    proficiency: LanguageProficiency;
};

export type PublicJobPostPreview = PublicJobPostCard & {
    jobDescription: string | null;
    otherRequirements: string | null;
    applicationInstructions: string | null;
    contractType: ContractDuration;
    educationLevel: EducationLevel;
    minExperienceYears: number | null;
    maxExperienceYears: number | null;
    genderRequirement: GenderRequirement;
    languages: PublicJobPostLanguage[];
};

export type PublicJobPostDetail = PublicJobPostPreview & {
    salaryCurrency: string | null;
    monthlySalaryMin: string | null;
    monthlySalaryMax: string | null;
    displayStatus: 'active' | 'expired' | 'closed' | 'archived';
    isAcceptingApplications: boolean;
    /** Job orders only; always `null` for manpooling. */
    jobOrderNumber: string | null;
    /** Job orders only; always `null` for manpooling. */
    employerDetails: {
        name: string;
        location: string;
        licenseNumber: string;
    } | null;
    contact: {
        name: string | null;
        email: string | null;
        phone: string | null;
    };
};

export type PublicAgencyReview = {
    id: number;
    reviewer: string;
    rating: number;
    comment: string;
    date: string | null;
};

export type JobFilterId = 'landbased' | 'seabased' | 'urgent' | 'recent';

/** A row on My Jobs: the public card plus the applicant's own state. */
export type ApplicantJobPost = PublicJobPostCard & {
    displayStatus: 'active' | 'expired' | 'closed' | 'archived';
    isAcceptingApplications: boolean;
    /** Set on the Applied and Archived tabs. */
    applicationStage: string | null;
    appliedAt: string | null;
    /** Set on the Saved tab. */
    savedAt: string | null;
};
