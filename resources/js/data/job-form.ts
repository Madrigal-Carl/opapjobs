import { getAgencyContext, getAgencyPathway } from '@/data/agency-context';
import { getEmployer } from '@/data/employers';
import { formatSalaryRange } from '@/data/job-attributes';
import type { Job } from '@/types/job';
import { z } from 'zod';

const experience = z
    .string()
    .refine(
        (value) =>
            Boolean(value.trim()) &&
            Number.isInteger(Number(value)) &&
            Number(value) >= 0,
        'Enter experience of 0 years or more.',
    );
const salary = z
    .string()
    .refine(
        (value) =>
            value === '' ||
            (/^\d+(?:,\d{3})*$/.test(value) &&
                Number.isFinite(Number(value.replaceAll(',', '')))),
        'Enter a valid salary amount of 0 or more.',
    );

const experienceRange = z.object({
    minExperienceYears: experience,
    maxExperienceYears: z.union([z.literal(''), experience]),
});
const salaryRange = z.object({ salaryMin: salary, salaryMax: salary });

/** Frontend listing schema, shared by draft saving and the review/publish flow. */
export const jobFormSchema = z
    .object({
        postingType: z.enum(['joborder', 'manpooling']),
        employer: z.string(),
        title: z.string().trim().min(1, 'Enter the job title.'),
        category: z.string().min(1, 'Choose a category.'),
        subCategory: z.string().min(1, 'Choose a sub-category.'),
        location: z.string().trim().min(1, 'Enter the job location.'),
        quantity: z
            .number({ error: 'Quantity must be at least 1.' })
            .int('Enter a whole number of positions.')
            .min(1, 'Quantity must be at least 1.'),
        gender: z.enum(['any', 'male', 'female']),
        salaryCurrency: z.enum([
            'SAR',
            'AED',
            'QAR',
            'KWD',
            'SGD',
            'USD',
            'PHP',
        ]),
        ...salaryRange.shape,
        description: z
            .string()
            .trim()
            .min(1, 'Describe the role so applicants know what to expect.'),
        closingDate: z.union([
            z.literal(''),
            z.iso.date({ error: 'Enter a valid closing date.' }),
        ]),
        ...experienceRange.shape,
        education: z
            .enum(['', 'any', 'secondary', 'vocational', 'bachelor', 'master'])
            .refine(
                (value): boolean => value !== '' && value !== 'any',
                'Choose an education level.',
            ),
        contractDuration: z.enum(['permanent', 'fixed', 'seasonal']),
        languages: z.array(
            z.object({
                language: z.string().min(1),
                proficiency: z.enum(['basic', 'conversational', 'fluent']),
            }),
        ),
        otherRequirements: z.string(),
        contactName: z.string(),
        contactEmail: z
            .string()
            .trim()
            .refine(
                (value) => value === '' || z.email().safeParse(value).success,
                'Enter a valid email address.',
            ),
        contactPhone: z.string(),
        applyInstructions: z.string(),
        urgent: z.boolean(),
        questions: z.array(
            z.object({
                id: z.string(),
                label: z.string(),
                type: z.enum(['yesno', 'short', 'paragraph']),
                answer: z.string(),
                required: z.boolean().optional(),
            }),
        ),
    })
    .refine(
        (form) =>
            !form.maxExperienceYears ||
            Number(form.maxExperienceYears) >= Number(form.minExperienceYears),
        {
            path: ['maxExperienceYears'],
            message: 'Maximum experience must be at least the minimum.',
            when: ({ value }) => experienceRange.safeParse(value).success,
        },
    )
    .refine(
        (form) =>
            !form.salaryMin ||
            !form.salaryMax ||
            Number(form.salaryMax.replaceAll(',', '')) >=
                Number(form.salaryMin.replaceAll(',', '')),
        {
            path: ['salaryMax'],
            message: 'Maximum salary must be at least the minimum.',
            when: ({ value }) => salaryRange.safeParse(value).success,
        },
    );

export type JobForm = z.infer<typeof jobFormSchema>;

export const emptyJobForm: JobForm = {
    postingType: 'joborder',
    employer: '',
    title: '',
    category: '',
    subCategory: '',
    location: '',
    quantity: 1,
    gender: 'any',
    salaryCurrency: 'SAR',
    salaryMin: '',
    salaryMax: '',
    description: '',
    closingDate: '',
    minExperienceYears: '',
    maxExperienceYears: '',
    education: '',
    contractDuration: 'fixed',
    languages: [],
    otherRequirements: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    applyInstructions: '',
    urgent: false,
    questions: [{ id: 'question-1', label: '', type: 'yesno', answer: '' }],
};

/** One mapping shared by review, draft saving, and final publication. */
export function buildJobListing(
    form: JobForm,
    status: 'draft' | 'published',
): Job {
    const employer = getEmployer(form.employer);
    const phone = form.contactPhone.trim();

    return {
        id: 'job-preview',
        status,
        title: form.title.trim(),
        employer: form.employer.trim(),
        agency: getAgencyContext().name,
        pathway: getAgencyPathway(),
        location: form.location.trim(),
        salary: formatSalaryRange(
            form.salaryCurrency,
            form.salaryMin,
            form.salaryMax,
        ),
        posted: 'Just now',
        postingType: form.postingType,
        employerLocation: employer?.location ?? '',
        poeaLicenseNo: employer?.poeaLicenseNo ?? '',
        quantity: form.quantity,
        gender: form.gender,
        category: form.category,
        subCategory: form.subCategory,
        description: form.description.trim(),
        closingDate: form.closingDate || undefined,
        minExperienceYears: form.minExperienceYears.trim()
            ? Number(form.minExperienceYears)
            : undefined,
        maxExperienceYears: form.maxExperienceYears.trim()
            ? Number(form.maxExperienceYears)
            : undefined,
        education: form.education || undefined,
        contractDuration: form.contractDuration,
        languages: form.languages,
        otherRequirements: form.otherRequirements.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: phone && !/^\+\d+$/.test(phone) ? phone : undefined,
        applyInstructions: form.applyInstructions.trim() || undefined,
        featured: false,
        urgent: form.urgent,
        recent: true,
        questions: form.questions
            .map((question) => ({
                ...question,
                label: question.label.trim(),
                answer: question.answer.trim(),
            }))
            .filter((question) => question.label),
    };
}
