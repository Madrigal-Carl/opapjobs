// MOCK DATA: application details are derived from the candidate and job post.
// Replace with the submitted application and profile snapshot later.
import type { Applicant } from '@/types/applicant';
import type { Application, ApplicationDetail } from '@/types/application';
import type { Job } from '@/types/job';

export function getApplicationDetail(
    application: Application,
    applicant: Applicant,
    job: Job,
): ApplicationDetail {
    const nameKey = applicant.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '');
    const year = Number(application.appliedAt.slice(0, 4));
    const yearsExperience = Number.parseInt(applicant.experience, 10) || 0;
    const resumeId = `resume-${application.id}`;
    const uploadedAt = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(`${application.appliedAt}T12:00:00`));
    const questions = job.questions ?? [];
    const unansweredId =
        application.id % 2 === 0
            ? questions.find((question) => !question.required)?.id
            : undefined;
    const answers: ApplicationDetail['answers'] = {};

    for (const question of questions) {
        if (question.id === unansweredId) {
            continue;
        }

        answers[question.id] =
            question.type === 'yesno'
                ? 'Yes'
                : question.type === 'short'
                  ? `${applicant.experience} of experience as a ${applicant.role}.`
                  : `As a ${applicant.role}, I bring ${applicant.experience} of practical experience to this role. I follow agreed procedures, keep clear records and communicate with my team.\n\nI would welcome the opportunity to discuss how these skills can support the team at ${job.employer}.`;
    }

    return {
        email: `${nameKey}@example.com`,
        phone: `+63 917 ${String(applicant.id).padStart(7, '0')}`,
        headline: applicant.role,
        summary: `${applicant.role} based in ${applicant.location}, with ${applicant.experience} of experience. Skilled in ${applicant.skills.join(', ')} and committed to reliable work, safe practices and clear communication.`,
        experiences: [
            {
                id: `experience-${applicant.id}`,
                role: applicant.role,
                company: 'Regional Services Group',
                start: `Jan ${year - yearsExperience}`,
                end: '',
                location: applicant.location,
                description: `Deliver day-to-day work as a ${applicant.role}, applying ${applicant.skills.join(', ')}. Coordinate with colleagues, document completed work and follow workplace safety procedures.`,
            },
        ],
        education: [
            {
                id: `education-${applicant.id}`,
                degree: 'Professional diploma',
                field: applicant.role,
                school: 'Technical Skills Institute',
                start: String(year - yearsExperience - 2),
                end: String(year - yearsExperience),
            },
        ],
        certifications: [
            {
                id: `certification-${applicant.id}`,
                name: `${applicant.skills[0] ?? applicant.role} training`,
                issuer: 'Professional Training Centre',
                issueDate: `${year - 1}-06-01`,
                expiryDate: '',
                credentialUrl: '',
            },
        ],
        skills: applicant.skills.map((name, index) => ({
            id: `skill-${applicant.id}-${index}`,
            name,
            level: index === 0 ? 'Expert' : 'Advanced',
        })),
        documents: [
            {
                id: resumeId,
                name: `${nameKey.replaceAll('.', '-')}-resume.pdf`,
                size: '186 KB',
                uploadedAt,
                url: '',
                primary: true,
            },
            {
                id: `certificate-${application.id}`,
                name: 'training-certificate.pdf',
                size: '124 KB',
                uploadedAt,
                url: '',
                primary: false,
            },
            {
                id: `passport-${application.id}`,
                name: 'passport.pdf',
                size: '240 KB',
                uploadedAt,
                url: '',
                primary: false,
            },
        ],
        resumeId,
        coverLetter: `Dear recruitment team,\n\nI would like to apply for the ${job.title} position at ${job.employer}. My ${applicant.experience} of experience as a ${applicant.role} has developed my skills in ${applicant.skills.join(', ')}.\n\nI am ${applicant.availability.toLowerCase()} and would welcome the opportunity to discuss the role. Thank you for considering my application.\n\n${applicant.name}`,
        expectedSalary: job.salary || 'Negotiable',
        availability: applicant.availability,
        answers,
    };
}
