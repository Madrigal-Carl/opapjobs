import type {
    ApplicantCertificationRecord,
    ApplicantDocumentRecord,
    ApplicantEducationRecord,
    ApplicantExperienceRecord,
    ApplicantProfileRecord,
    ApplicantSkillRecord,
} from '../types';

/**
 * Applicant profiles, resume sections and documents (§9.1–§9.3), built to
 * the column lists in the docs rather than the older `types/applicant-*.ts`
 * reference shapes.
 *
 * Ids 12–17 match the applicant accounts in `seeds/accounts.ts`.
 */

export function seedApplicantProfiles(): ApplicantProfileRecord[] {
    return [
        {
            userId: 12,
            headline: 'Electrical technician, 8 years landbased and marine',
            phoneNumber: '+63 917 555 0142',
            currentLocation: 'Cebu City',
            avatarPath: null,
            professionalSummary:
                'Electrical technician with 8+ years across marine and landbased environments, comfortable working under load schedules.',
            defaultCoverLetter:
                'I am writing to express my strong interest in this position.',
            isVisibleToAgencies: true,
            availability: 'immediately',
            preferredPathway: 'landbased',
        },
        {
            userId: 13,
            headline: 'Registered Nurse with bedside and ICU exposure',
            phoneNumber: '+63 918 555 0177',
            currentLocation: 'Manila',
            avatarPath: null,
            professionalSummary:
                'PRC-licensed nurse with five years of ICU experience in a tertiary hospital.',
            defaultCoverLetter: null,
            isVisibleToAgencies: true,
            availability: 'within_2_weeks',
            preferredPathway: 'landbased',
        },
        {
            userId: 14,
            headline: 'Housekeeping supervisor, cruise ship background',
            phoneNumber: '+63 920 555 0119',
            currentLocation: 'Taguig City',
            avatarPath: null,
            professionalSummary: null,
            defaultCoverLetter: null,
            isVisibleToAgencies: false,
            availability: 'within_1_month',
            preferredPathway: 'seabased',
        },
        {
            userId: 15,
            headline: 'Caregiver, NC II certified',
            phoneNumber: '+63 921 555 0188',
            currentLocation: 'Davao City',
            avatarPath: null,
            professionalSummary:
                'Certified caregiver specialising in elderly care.',
            defaultCoverLetter: null,
            isVisibleToAgencies: true,
            availability: 'more_than_1_month',
            preferredPathway: 'landbased',
        },
        {
            userId: 16,
            headline: 'Able Seaman, deck department',
            phoneNumber: '+63 922 555 0164',
            currentLocation: 'Iloilo City',
            avatarPath: null,
            professionalSummary:
                'AB seaman with two contracts on cargo vessels.',
            defaultCoverLetter: 'Available for immediate deployment.',
            isVisibleToAgencies: true,
            availability: 'immediately',
            preferredPathway: 'seabased',
        },
        {
            userId: 17,
            headline: 'Welder, 6 years structural and pipe',
            phoneNumber: '+63 923 555 0133',
            currentLocation: 'Batangas City',
            avatarPath: null,
            professionalSummary: null,
            defaultCoverLetter: null,
            isVisibleToAgencies: true,
            availability: null,
            preferredPathway: null,
        },
    ];
}

export function seedApplicantExperiences(): ApplicantExperienceRecord[] {
    return [
        {
            id: 1,
            applicantUserId: 12,
            jobRole: 'Electrical Technician',
            companyName: 'Al Muhaidib Contracting',
            startedOn: '2021-03-01',
            endedOn: null,
            workLocation: 'Riyadh, Saudi Arabia',
            responsibilities:
                'Maintained LV switchgear and motor control centres on a preventive schedule.',
            sortOrder: 0,
        },
        {
            id: 2,
            applicantUserId: 12,
            jobRole: 'Ship Electrician',
            companyName: 'V.Ships Management',
            startedOn: '2017-06-01',
            endedOn: '2020-11-30',
            workLocation: 'Singapore',
            responsibilities:
                'Watchkeeping and repair of deck and engine electronics.',
            sortOrder: 1,
        },
        {
            id: 3,
            applicantUserId: 13,
            jobRole: 'Staff Nurse',
            companyName: 'Philippine General Hospital',
            startedOn: '2019-08-01',
            endedOn: null,
            workLocation: 'Manila',
            responsibilities: 'ICU bedside care and patient handover.',
            sortOrder: 0,
        },
        {
            id: 4,
            applicantUserId: 16,
            jobRole: 'Able Seaman',
            companyName: 'Columbia Shipmanagement',
            startedOn: '2023-02-01',
            endedOn: null,
            workLocation: 'At sea',
            responsibilities: 'Deck watch, mooring and cargo securing.',
            sortOrder: 0,
        },
    ];
}

export function seedApplicantEducation(): ApplicantEducationRecord[] {
    return [
        {
            id: 1,
            applicantUserId: 12,
            schoolName: 'Cebu Technological University',
            degree: 'BS Electrical Engineering',
            fieldOfStudy: 'Electrical Engineering',
            startedOn: '2011-06-01',
            endedOn: '2015-04-30',
            sortOrder: 0,
        },
        {
            id: 2,
            applicantUserId: 13,
            schoolName: 'University of Santo Tomas',
            degree: 'BS Nursing',
            fieldOfStudy: 'Nursing',
            startedOn: '2014-06-01',
            endedOn: '2018-04-30',
            sortOrder: 0,
        },
    ];
}

export function seedApplicantCertifications(): ApplicantCertificationRecord[] {
    return [
        {
            id: 1,
            applicantUserId: 12,
            certificationName: 'NC II Electrical Installation and Maintenance',
            issuingOrganization: 'TESDA',
            issuedOn: '2016-05-12',
            expiresOn: null,
            credentialUrl: null,
            sortOrder: 0,
        },
        {
            id: 2,
            applicantUserId: 13,
            certificationName: 'PRC License — Nursing',
            issuingOrganization: 'Professional Regulation Commission',
            issuedOn: '2018-09-01',
            expiresOn: '2027-09-01',
            credentialUrl: null,
            sortOrder: 0,
        },
    ];
}

export function seedApplicantSkills(): ApplicantSkillRecord[] {
    return [
        {
            id: 1,
            applicantUserId: 12,
            skillName: 'LV switchgear maintenance',
            skillLevel: 'expert',
            sortOrder: 0,
        },
        {
            id: 2,
            applicantUserId: 12,
            skillName: 'Motor control centres',
            skillLevel: 'advanced',
            sortOrder: 1,
        },
        {
            id: 3,
            applicantUserId: 13,
            skillName: 'ICU bedside care',
            skillLevel: 'advanced',
            sortOrder: 0,
        },
        {
            id: 4,
            applicantUserId: 16,
            skillName: 'Mooring operations',
            skillLevel: 'intermediate',
            sortOrder: 0,
        },
    ];
}

export function seedApplicantDocuments(): ApplicantDocumentRecord[] {
    return [
        {
            id: 1,
            applicantUserId: 12,
            documentType: 'resume',
            originalFileName: 'ocampo-resume.pdf',
            storagePath: 'private/applicants/12/ocampo-resume.pdf',
            mimeType: 'application/pdf',
            fileSizeBytes: 245_760,
            isPrimary: true,
            uploadedAt: '2026-09-12T09:00:00.000Z',
            deletedAt: null,
        },
        {
            id: 2,
            applicantUserId: 12,
            documentType: 'certificate',
            originalFileName: 'nc2-electrical.pdf',
            storagePath: 'private/applicants/12/nc2-electrical.pdf',
            mimeType: 'application/pdf',
            fileSizeBytes: 512_000,
            isPrimary: false,
            uploadedAt: '2026-09-12T09:05:00.000Z',
            deletedAt: null,
        },
        {
            id: 3,
            applicantUserId: 13,
            documentType: 'resume',
            originalFileName: 'santos-cv.docx',
            storagePath: 'private/applicants/13/santos-cv.docx',
            mimeType:
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            fileSizeBytes: 88_000,
            isPrimary: true,
            uploadedAt: '2026-09-14T09:00:00.000Z',
            deletedAt: null,
        },
        {
            id: 4,
            applicantUserId: 14,
            documentType: 'passport',
            originalFileName: 'padilla-passport.pdf',
            storagePath: 'private/applicants/14/padilla-passport.pdf',
            mimeType: 'application/pdf',
            fileSizeBytes: 1_024_000,
            isPrimary: false,
            uploadedAt: '2026-09-15T09:00:00.000Z',
            deletedAt: '2026-10-01T09:00:00.000Z',
        },
        {
            id: 5,
            applicantUserId: 16,
            documentType: 'resume',
            originalFileName: 'manalo-resume.pdf',
            storagePath: 'private/applicants/16/manalo-resume.pdf',
            mimeType: 'application/pdf',
            fileSizeBytes: 320_000,
            isPrimary: true,
            uploadedAt: '2026-09-18T09:00:00.000Z',
            deletedAt: null,
        },
    ];
}
