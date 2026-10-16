// MOCK DATA: the applicant resume is built from the signed-in Inertia user so
// the name and avatar stay consistent with the header. Replace with real
// persistence later.
import {
    RESUME_COMPLETENESS_FIELDS,
    type ApplicantProfile,
    type ProfileOwner,
    type ResumeDocument,
    type SkillLevel,
} from '@/types/applicant-profile';

export const SAVED_COVER_LETTER =
    'I am writing to express my strong interest in this position. With eight years of experience across marine and landbased electrical work, I bring hands-on reliability, current safety certifications, and a proven record of maintaining high uptime in demanding environments. I am available to start immediately and can provide all required documents on request.';

export const demoDocuments: ResumeDocument[] = [
    {
        id: 'doc-1',
        name: 'resume.pdf',
        uploadedAt: 'Sep 14, 2026',
        size: '186 KB',
        url: '',
        primary: true,
    },
    {
        id: 'doc-2',
        name: 'curriculum-vitae.docx',
        uploadedAt: 'Aug 02, 2026',
        size: '92 KB',
        url: '',
        primary: false,
    },
];

/**
 * Builds the resume the apply flow reads from. Name, email and avatar come
 * from the signed-in user; everything else is seeded.
 */
export function buildApplicantProfile(owner: ProfileOwner): ApplicantProfile {
    return {
        name: owner.name,
        headline: 'Senior Electrical Technician · Landbased (Middle East)',
        email: owner.email,
        phone: '+63 917 555 0142',
        location: 'Manila, Philippines',
        avatarUrl: owner.avatar ?? '',
        summary:
            'Electrical technician with 8+ years across marine and landbased environments, including LV switchgear, motor control centres and preventive-maintenance programs. Comfortable working under load schedules in the Gulf, fluent in technical documentation, and holding current MARINA safety certifications.',
        visibleToEmployers: true,
        experiences: [
            {
                id: 'exp-1',
                role: 'Electrical Technician',
                company: 'Al Muhaidib Contracting',
                start: 'Mar 2021',
                end: '',
                location: 'Riyadh, Saudi Arabia',
                description:
                    'Install, maintain and troubleshoot LV switchgear and motor control centres on large commercial projects. Lead a two-person team on preventive-maintenance shutdowns.',
            },
            {
                id: 'exp-2',
                role: 'Facilities Electrician',
                company: 'Manila Electric Company',
                start: 'Jun 2017',
                end: 'Feb 2021',
                location: 'Manila, Philippines',
                description:
                    'Performed corrective and preventive maintenance on substation equipment and distribution panels. Maintained a 99.4% uptime record across assigned sites.',
            },
        ],
        education: [
            {
                id: 'edu-1',
                school: 'University of Santo Tomas',
                degree: 'BS Electrical Engineering',
                field: 'Electrical Engineering',
                start: '2012',
                end: '2016',
            },
            {
                id: 'edu-2',
                school: 'TESDA',
                degree: 'NC II',
                field: 'Electrical Installation and Maintenance',
                start: '2017',
                end: '2017',
            },
        ],
        certifications: [
            {
                id: 'cert-1',
                name: 'Basic Safety Training (BST)',
                issuer: 'MARINA',
                issueDate: '2023-05-12',
                expiryDate: '2028-05-12',
                credentialUrl: '',
            },
            {
                id: 'cert-2',
                name: 'Certified Electrical Safety Technician',
                issuer: 'National Electrical Code Council',
                issueDate: '2022-03-01',
                expiryDate: '2025-03-01',
                credentialUrl: '',
            },
        ],
        skills: [
            {
                id: 'skill-1',
                name: 'LV/HV Electrical Systems',
                level: 'Expert',
            },
            {
                id: 'skill-2',
                name: 'Motor Control Circuits',
                level: 'Advanced',
            },
            {
                id: 'skill-3',
                name: 'PLC Troubleshooting',
                level: 'Intermediate',
            },
            {
                id: 'skill-4',
                name: 'Technical Documentation',
                level: 'Advanced',
            },
            { id: 'skill-5', name: 'SCADA Systems', level: 'Intermediate' },
        ],
        documents: demoDocuments,
        coverLetter: SAVED_COVER_LETTER,
    };
}

/**
 * How much of the resume is filled in, as a percentage. Each section counts
 * once no matter how many entries it holds, so one long history cannot stand
 * in for a missing section.
 */
export function resumeCompleteness(profile: ApplicantProfile): number {
    const filled = RESUME_COMPLETENESS_FIELDS.filter((field) => {
        const value = profile[field];

        if (typeof value === 'string') {
            return value.trim().length > 0;
        }

        return value.length > 0;
    }).length;

    return Math.round((filled / RESUME_COMPLETENESS_FIELDS.length) * 100);
}

export function formatToday(): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date());
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function newEntryId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : String(Date.now());
}

export function countLabel(count: number, singular: string): string {
    return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

export function skillLevelDots(level: SkillLevel): number {
    return { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 }[level];
}
