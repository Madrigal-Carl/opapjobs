import type { Pathway } from './agency';

export type PostingType = 'manpooling' | 'joborder';
export type GenderRequirement = 'any' | 'male' | 'female';
export type ContractDuration = 'permanent' | 'fixed' | 'seasonal';
export type EducationLevel =
    | 'any'
    | 'secondary'
    | 'vocational'
    | 'bachelor'
    | 'master';
export type LanguageProficiency = 'basic' | 'conversational' | 'fluent';

export type QuestionAnswerType = 'yesno' | 'short' | 'paragraph';

export type JobQuestion = {
    id: string;
    label: string;
    type: QuestionAnswerType;
    /** The agency's example answer, shown to staff in the preview. */
    answer: string;
    /** Applicants cannot continue past this question without an answer. */
    required?: boolean;
};

export type JobLanguage = {
    language: string;
    proficiency: LanguageProficiency;
};

export type Job = {
    id: string;
    title: string;
    employer: string;
    agency: string;
    pathway: Pathway;
    location: string;
    salary: string;
    posted: string;
    postingType: PostingType;
    employerLocation: string;
    poeaLicenseNo: string;
    quantity: number;
    gender: GenderRequirement;
    category: string;
    subCategory: string;

    /** Free-text blurb shown on the listing. */
    description?: string;
    /** ISO date the listing closes for applications. */
    closingDate?: string;
    /** Set when the agency stops a listing before its closing date. */
    closedEarly?: boolean;
    /** Set when the agency files a listing away without closing it. */
    archived?: boolean;
    /** Experience band in years, omitted when open-ended. */
    minExperienceYears?: number;
    maxExperienceYears?: number;
    education?: EducationLevel;
    contractDuration?: ContractDuration;
    benefits?: string[];
    languages?: JobLanguage[];
    ageMin?: number;
    ageMax?: number;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    applyInstructions?: string;

    featured?: boolean;
    urgent?: boolean;
    recent?: boolean;
    questions?: JobQuestion[];
};
