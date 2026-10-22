import { z } from 'zod';
import type { FieldPath } from 'react-hook-form';
import type {
    ContractDuration,
    EducationLevel,
    GenderRequirement,
    LanguageProficiency,
    PostingType,
    QuestionAnswerType,
} from '@/types/job';

export type JobFormOptions = {
    currencies: string[];
    contract_types: ContractDuration[];
    education_levels: Exclude<EducationLevel, 'any'>[];
    languages: string[];
    proficiencies: LanguageProficiency[];
    genders: GenderRequirement[];
    recruitment_types: PostingType[];
    answer_types: QuestionAnswerType[];
};
export type JobPostCategory = {
    id: number;
    name: string;
    subcategories: { id: number; name: string }[];
};
export type JobPostEmployer = {
    id: number;
    name: string;
    location: string;
    license_number: string;
};
export type JobPostFormProps = {
    agency: { id: number; name: string; pathway: 'landbased' | 'seabased' };
    categories: JobPostCategory[];
    employers: JobPostEmployer[];
    options: JobFormOptions;
    today: string;
};
export type DuplicateJobPost = {
    id: number;
    job_title: string;
    created_at: string | null;
    display_status: string;
};

const text = z.string().trim().max(255);
const richText = z
    .string()
    .trim()
    .max(20000)
    .refine(
        (value) => !/<\s*\/?\s*[a-z!]/i.test(value),
        'Use plain text with lightweight markup, not HTML.',
    );
const experience = z
    .string()
    .trim()
    .refine(
        (value) =>
            value === '' || (/^\d+$/.test(value) && Number(value) <= 255),
        'Enter a whole number from 0 to 255.',
    );
const salary = z
    .string()
    .trim()
    .refine(
        (value) =>
            value === '' ||
            (/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value) &&
                Number(value.replaceAll(',', '')) <= 9999999999.99),
        'Enter a salary from 0 to 9,999,999,999.99 with at most two decimal places.',
    );

export function createJobFormSchema(
    options: JobFormOptions,
    today: string,
    categories: JobPostCategory[],
) {
    return z
        .object({
            postingType: z.enum(options.recruitment_types),
            employerId: z.number().int().positive().nullable(),
            title: text.min(1, 'Enter the job title.'),
            categoryId: z
                .number()
                .int()
                .positive()
                .nullable()
                .refine(
                    (value): boolean => value !== null,
                    'Choose a category.',
                ),
            subcategoryId: z
                .number()
                .int()
                .positive()
                .nullable()
                .refine(
                    (value): boolean => value !== null,
                    'Choose a sub-category.',
                ),
            location: text.min(1, 'Enter the job location.'),
            quantity: z.number().int().min(1).max(65535),
            gender: z.enum(options.genders),
            salaryCurrency: z
                .string()
                .refine(
                    (value) =>
                        value === '' || options.currencies.includes(value),
                    'Choose a valid currency.',
                ),
            salaryMin: salary,
            salaryMax: salary,
            description: richText.refine(
                (value) => value.length > 0,
                'Describe the role so applicants know what to expect.',
            ),
            closingDate: z
                .union([z.literal(''), z.iso.date()])
                .refine(
                    (value) => value === '' || value >= today,
                    'Choose today or a future date.',
                ),
            minExperienceYears: experience,
            maxExperienceYears: experience,
            education: z
                .union([z.literal(''), z.enum(options.education_levels)])
                .refine(
                    (value): boolean => value !== '',
                    'Choose an education level.',
                ),
            contractDuration: z.enum(options.contract_types),
            // Sent only for a "with job order" posting; `superRefine` below
            // is what makes it required for that type.
            jobOrderNumber: text,
            // Free-text names rather than a fixed list: agencies ask for
            // whatever their employer asks for ("COC", "PSNC", "NBI").
            requiredDocuments: z
                .array(
                    z
                        .string()
                        .trim()
                        .min(1, 'Enter the document name or remove it.'),
                )
                .max(20, 'A job post can list at most 20 required documents.'),
            languages: z
                .array(
                    z.object({
                        language: z.enum(options.languages),
                        proficiency: z.enum(options.proficiencies),
                    }),
                )
                .max(options.languages.length),
            otherRequirements: richText,
            contactName: text,
            contactEmail: text.refine(
                (value) => value === '' || z.email().safeParse(value).success,
                'Enter a valid email address.',
            ),
            contactPhone: text,
            applyInstructions: richText,
            urgent: z.boolean(),
            questions: z
                .array(
                    z
                        .object({
                            label: text.min(
                                1,
                                'Enter the question or remove it',
                            ),
                            type: z.enum(options.answer_types),
                            answer: z.string().trim().max(2000),
                            required: z.boolean(),
                        })
                        .refine(
                            (question) =>
                                question.type !== 'yesno' ||
                                question.answer === '' ||
                                ['yes', 'no'].includes(
                                    question.answer.toLowerCase(),
                                ),
                            {
                                path: ['answer'],
                                message: 'Choose Yes, No, or no preference.',
                            },
                        ),
                )
                .max(20, 'A job post can have at most 20 screening questions.'),
        })
        .superRefine((form, context) => {
            const issue = (path: (string | number)[], message: string) =>
                context.addIssue({ code: 'custom', path, message });
            if (
                !categories
                    .find((category) => category.id === form.categoryId)
                    ?.subcategories.some(
                        (subcategory) => subcategory.id === form.subcategoryId,
                    )
            ) {
                issue(
                    ['subcategoryId'],
                    'Choose a sub-category from the selected category.',
                );
            }
            if (
                form.postingType === 'joborder' &&
                form.jobOrderNumber.trim() === ''
            )
                issue(['jobOrderNumber'], 'Enter the job order number.');
            if (
                (form.salaryMin !== '' || form.salaryMax !== '') &&
                !form.salaryCurrency
            )
                issue(
                    ['salaryCurrency'],
                    'Choose a currency when entering a salary.',
                );
            if (
                form.salaryMin !== '' &&
                form.salaryMax !== '' &&
                Number(form.salaryMax.replaceAll(',', '')) <
                    Number(form.salaryMin.replaceAll(',', ''))
            )
                issue(
                    ['salaryMax'],
                    'Maximum salary must be at least the minimum.',
                );
            if (
                form.minExperienceYears !== '' &&
                form.maxExperienceYears !== '' &&
                Number(form.maxExperienceYears) <
                    Number(form.minExperienceYears)
            )
                issue(
                    ['maxExperienceYears'],
                    'Maximum experience must be at least the minimum.',
                );
            const languages = new Set<string>();
            form.languages.forEach((entry, index) => {
                if (languages.has(entry.language))
                    issue(
                        ['languages', index, 'language'],
                        'This language is already included.',
                    );
                languages.add(entry.language);
            });
            const questions = new Set<string>();
            form.questions.forEach((question, index) => {
                const normalized = question.label.trim().toLowerCase();
                if (questions.has(normalized))
                    issue(
                        ['questions', index, 'label'],
                        'This question is already included.',
                    );
                questions.add(normalized);
            });
        });
}

export type JobForm = z.infer<ReturnType<typeof createJobFormSchema>>;
export const emptyJobForm: JobForm = {
    postingType: 'joborder',
    employerId: null,
    title: '',
    categoryId: null,
    subcategoryId: null,
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
    jobOrderNumber: '',
    requiredDocuments: [],
    otherRequirements: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    applyInstructions: '',
    urgent: false,
    questions: [],
};

const nullableText = (value: string) => value.trim() || null;
const nullableNumber = (value: string) =>
    value.trim() === '' ? null : Number(value.replaceAll(',', ''));

export function toJobPostPayload(form: JobForm) {
    return {
        recruitment_type: form.postingType,
        employer_id: form.employerId,
        job_title: form.title.trim(),
        job_subcategory_id: form.subcategoryId,
        work_location: form.location.trim(),
        vacant_positions: form.quantity,
        contract_type: form.contractDuration,
        job_order_number:
            form.postingType === 'joborder'
                ? nullableText(form.jobOrderNumber)
                : null,
        required_documents: form.requiredDocuments
            .map((document) => document.trim())
            .filter(Boolean),
        salary_currency: nullableText(form.salaryCurrency),
        monthly_salary_min: nullableNumber(form.salaryMin),
        monthly_salary_max: nullableNumber(form.salaryMax),
        education_level: form.education,
        min_experience_years: nullableNumber(form.minExperienceYears),
        max_experience_years: nullableNumber(form.maxExperienceYears),
        gender_requirement: form.gender,
        job_description: form.description.trim(),
        other_requirements: nullableText(form.otherRequirements),
        application_instructions: nullableText(form.applyInstructions),
        contact_person_name: nullableText(form.contactName),
        contact_email: nullableText(form.contactEmail),
        contact_phone: nullableText(form.contactPhone),
        closing_date: nullableText(form.closingDate),
        is_urgent: form.urgent,
        languages: form.languages.map(({ language, proficiency }) => ({
            language,
            proficiency,
        })),
        questions: form.questions.map(({ label, type, answer, required }) => ({
            question_text: label.trim(),
            answer_type: type,
            expected_answer: nullableText(
                type === 'yesno' ? answer.toLowerCase() : answer,
            ),
            is_required: required,
        })),
    };
}

export function copyQuestion(
    question: JobForm['questions'][number],
): JobForm['questions'][number] {
    return {
        label: question.label,
        type: question.type,
        answer: question.answer,
        required: question.required,
    };
}

export function questionMoveTarget(
    index: number,
    direction: -1 | 1,
    count: number,
): number | null {
    const target = index + direction;
    return target >= 0 && target < count ? target : null;
}

const serverFields: Record<string, keyof JobForm> = {
    recruitment_type: 'postingType',
    employer_id: 'employerId',
    job_title: 'title',
    job_subcategory_id: 'subcategoryId',
    work_location: 'location',
    vacant_positions: 'quantity',
    contract_type: 'contractDuration',
    job_order_number: 'jobOrderNumber',
    required_documents: 'requiredDocuments',
    salary_currency: 'salaryCurrency',
    monthly_salary_min: 'salaryMin',
    monthly_salary_max: 'salaryMax',
    education_level: 'education',
    min_experience_years: 'minExperienceYears',
    max_experience_years: 'maxExperienceYears',
    gender_requirement: 'gender',
    job_description: 'description',
    other_requirements: 'otherRequirements',
    application_instructions: 'applyInstructions',
    contact_person_name: 'contactName',
    contact_email: 'contactEmail',
    contact_phone: 'contactPhone',
    closing_date: 'closingDate',
    is_urgent: 'urgent',
    questions: 'questions',
    languages: 'languages',
};

export function serverErrorField(key: string): FieldPath<JobForm> | null {
    if (serverFields[key]) return serverFields[key];
    const question =
        /^questions\.(\d+)\.(question_text|answer_type|expected_answer|is_required)$/.exec(
            key,
        );
    if (question) {
        const fields = {
            question_text: 'label',
            answer_type: 'type',
            expected_answer: 'answer',
            is_required: 'required',
        } as const;
        return `questions.${Number(question[1])}.${fields[question[2] as keyof typeof fields]}`;
    }
    const language = /^languages\.(\d+)\.(language|proficiency)$/.exec(key);
    return language
        ? `languages.${Number(language[1])}.${language[2] as 'language' | 'proficiency'}`
        : null;
}
