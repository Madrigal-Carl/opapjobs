import { formatSalaryRange } from '@/data/job-attributes';
import type { JobForm, JobPostFormProps } from '@/data/job-form';
import type { Job } from '@/types/job';

export function buildJobPostPreview(
    form: JobForm,
    props: Pick<JobPostFormProps, 'agency' | 'categories' | 'employers'>,
): Job {
    const employer = props.employers.find(
        (entry) => entry.id === form.employerId,
    );
    const category = props.categories.find(
        (entry) => entry.id === form.categoryId,
    );
    return {
        id: 'job-preview',
        title: form.title.trim(),
        employer: employer?.name ?? '',
        agency: props.agency.name,
        pathway: props.agency.pathway,
        location: form.location.trim(),
        salary: formatSalaryRange(
            form.salaryCurrency,
            form.salaryMin,
            form.salaryMax,
        ),
        posted: 'Just now',
        postingType: form.postingType,
        employerLocation: employer?.location ?? '',
        poeaLicenseNo: employer?.license_number ?? '',
        quantity: form.quantity,
        gender: form.gender,
        category: category?.name ?? '',
        subCategory:
            category?.subcategories.find(
                (entry) => entry.id === form.subcategoryId,
            )?.name ?? '',
        description: form.description,
        requiredDocuments: form.requiredDocuments,
        closingDate: form.closingDate || undefined,
        minExperienceYears:
            form.minExperienceYears === ''
                ? undefined
                : Number(form.minExperienceYears),
        maxExperienceYears:
            form.maxExperienceYears === ''
                ? undefined
                : Number(form.maxExperienceYears),
        education: form.education || undefined,
        contractDuration: form.contractDuration,
        languages: form.languages,
        otherRequirements: form.otherRequirements,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        applyInstructions: form.applyInstructions,
        urgent: form.urgent,
        questions: form.questions.map((question, index) => ({
            ...question,
            id: `preview-question-${index}`,
        })),
    };
}
