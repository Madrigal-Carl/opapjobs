import type { Pathway } from '@/types/agency';
import type { ApplicationStage } from '@/types/application';

export type ApplicationStageValue =
    | 'pending'
    | 'reviewed'
    | 'shortlisted'
    | 'interviewed'
    | 'hired'
    | 'rejected';

export const APPLICATION_STAGE_LABELS: Record<
    ApplicationStageValue,
    ApplicationStage
> = {
    pending: 'Pending',
    reviewed: 'Reviewed',
    shortlisted: 'Shortlisted',
    interviewed: 'Interviewed',
    hired: 'Hired',
    rejected: 'Rejected',
};

export type DashboardApplicationRow = {
    id: number;
    stage: ApplicationStageValue;
    submitted_at: string;
    applicant_name: string;
    job_title: string;
    employer_name: string | null;
    available_transitions: ('proceed' | 'reject')[];
    can_proceed: boolean;
    next_stage: ApplicationStageValue | null;
    can_reject: boolean;
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

export type DashboardApplicationDetail = {
    id: number;
    stage: ApplicationStageValue;
    submitted_at: string;
    cover_letter: string | null;
    expected_monthly_salary: string | null;
    availability:
        | 'immediately'
        | 'within_2_weeks'
        | 'within_1_month'
        | 'more_than_1_month'
        | null;
    applicant: {
        id: number;
        name: string;
        initials: string;
        email: string;
        phone: string | null;
        headline: string | null;
        location: string | null;
        pathway: Pathway | null;
    };
    job: {
        id: number;
        title: string;
        employer: string | null;
        agency: string | null;
        pathway: Pathway | null;
        location: string | null;
        salary: string;
        salary_currency: string | null;
        category: string | null;
        sub_category: string | null;
        posting_type: 'joborder' | 'manpooling' | null;
        job_order_number: string | null;
        contract_type: 'permanent' | 'fixed' | 'seasonal' | null;
        vacancies: number;
        education: 'secondary' | 'vocational' | 'bachelor' | 'master' | null;
        gender_requirement: 'any' | 'male' | 'female' | null;
        min_experience_years: number | null;
        max_experience_years: number | null;
        closing_date: string | null;
        posted_at: string | null;
        other_requirements: string | null;
        job_description: string | null;
        required_documents: string[];
        application_instructions: string | null;
        contact_person_name: string | null;
        contact_email: string | null;
        contact_phone: string | null;
        status: 'active' | 'expired' | 'closed' | 'archived';
        is_urgent: boolean;
        languages: { language: string; proficiency: string }[];
    };
    questions: {
        id: number;
        label: string;
        type: 'yesno' | 'short' | 'paragraph';
        required: boolean;
        answer: string | null;
    }[];
    documents: {
        id: number;
        name: string;
        document_type: 'resume' | 'certificate' | 'passport' | 'other';
        uploaded_at: string | null;
        size: string;
        url: string | null;
        primary: boolean;
    }[];
    resume_document_id: number | null;
    history: {
        id: number;
        from_stage: ApplicationStageValue | null;
        stage: ApplicationStageValue;
        changed_at: string | null;
        changed_by: string | null;
        note: string | null;
    }[];
    available_transitions: ('proceed' | 'reject')[];
    can_proceed: boolean;
    next_stage: ApplicationStageValue | null;
    can_reject: boolean;
    can_manage: boolean;
};
