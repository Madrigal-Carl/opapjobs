import type { Job, JobQuestion } from '@/types/job';
import type { JobFilterId, PublicJobPostDetail } from '@/types/public-catalog';

export const JOB_FILTER_LABELS: Record<JobFilterId, string> = {
    landbased: 'Landbased',
    seabased: 'Seabased',
    urgent: 'Urgent',
    recent: 'Recent',
};

export const JOB_FILTERS = Object.keys(JOB_FILTER_LABELS) as JobFilterId[];

export const CONFIDENTIAL_EMPLOYER_LABEL = 'Confidential employer';

/** A job post has one pathway, so these two toggles exclude each other. */
const PATHWAY_FILTERS: readonly JobFilterId[] = ['landbased', 'seabased'];

/**
 * The toggles after clicking `filter`. A pathway click selects that pathway
 * in place of the other, and one is always selected, so clicking the current
 * one changes nothing. Urgent and Recent turn on and off and combine freely
 * with either pathway. Returned in `JOB_FILTERS` order so the same selection
 * always produces the same URL.
 */
export function toggleJobFilter(
    active: readonly JobFilterId[],
    filter: JobFilterId,
): JobFilterId[] {
    if (PATHWAY_FILTERS.includes(filter)) {
        return JOB_FILTERS.filter(
            (id) =>
                id === filter ||
                (active.includes(id) && !PATHWAY_FILTERS.includes(id)),
        );
    }

    if (active.includes(filter)) {
        return JOB_FILTERS.filter((id) => id !== filter && active.includes(id));
    }

    return JOB_FILTERS.filter((id) => id === filter || active.includes(id));
}

/** Just the selected pathway, which is what clearing the filters leaves on. */
export function onlyJobPathway(active: readonly JobFilterId[]): JobFilterId[] {
    return active.filter((id) => PATHWAY_FILTERS.includes(id));
}

/**
 * The job post from the database in the `Job` shape the apply wizard and
 * the match report were written against. The location is already redacted
 * by the server, and a manpooling post carries no employer details, so the
 * blanks here stay blank.
 */
export function toApplyJob(
    post: PublicJobPostDetail,
    questions: JobQuestion[],
): Job {
    return {
        id: post.id,
        title: post.title,
        employer: post.employerDetails?.name ?? '',
        agency: post.agency,
        pathway: post.pathway,
        location: post.location,
        salary: post.salary,
        posted: post.posted,
        postingType: post.postingType,
        employerLocation: post.employerDetails?.location ?? '',
        poeaLicenseNo: post.employerDetails?.licenseNumber ?? '',
        quantity: post.vacantPositions,
        gender: post.genderRequirement,
        category: post.category ?? '',
        subCategory: post.subCategory ?? '',
        description: post.jobDescription ?? undefined,
        otherRequirements: post.otherRequirements ?? undefined,
        closingDate: post.closingDate ?? undefined,
        closedEarly: !post.isAcceptingApplications,
        minExperienceYears: post.minExperienceYears ?? undefined,
        maxExperienceYears: post.maxExperienceYears ?? undefined,
        education: post.educationLevel,
        contractDuration: post.contractType,
        languages: post.languages,
        contactName: post.contact.name ?? undefined,
        contactEmail: post.contact.email ?? undefined,
        contactPhone: post.contact.phone ?? undefined,
        applyInstructions: post.applicationInstructions ?? undefined,
        urgent: post.urgent,
        recent: post.recent,
        questions,
    };
}
