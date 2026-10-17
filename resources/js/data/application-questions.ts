// MOCK DATA: the option lists the apply wizard offers, and the sample
// cover-letter snippets it can insert for an applicant staring at a blank box.
import type { CoverLetterChip } from '@/types/application-draft';
import type { Job, JobQuestion } from '@/types/job';

/** Answers offered for a yes/no custom question. */
export const YES_NO_OPTIONS = ['Yes', 'No'] as const;

/** When the applicant could start. */
export const AVAILABILITY_OPTIONS = [
    'Immediately',
    'Within 2 weeks',
    'Within 1 month',
    'More than 1 month',
] as const;

/** Insert-able sentences for the cover letter. */
export const COVER_LETTER_CHIPS: CoverLetterChip[] = [
    {
        slug: 'certifications',
        label: 'Mention your certifications',
        snippet:
            'I hold the certifications required for this role and can provide copies on request.',
    },
    {
        slug: 'availability',
        label: 'Explain your availability',
        snippet:
            'I am available to start as soon as my documentation is complete.',
    },
    {
        slug: 'experience',
        label: 'Highlight relevant experience',
        snippet:
            'My recent experience is directly relevant to the duties described in this role.',
    },
];

/** The custom questions a listing asks, as a fresh array. */
export function getJobQuestions(job: Job): JobQuestion[] {
    return [...(job.questions ?? [])];
}

/** The questions that block Continue until they are answered. */
export function requiredJobQuestions(job: Job): JobQuestion[] {
    return getJobQuestions(job).filter((question) => question.required);
}
