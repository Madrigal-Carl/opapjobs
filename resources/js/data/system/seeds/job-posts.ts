import type { JobPostQuestionRecord, JobPostRecord } from '../types';

/**
 * Job posts and their screening questions (§8.2, §8.4).
 *
 * The spread is deliberate: every display status in §8.2 appears at least
 * once, so the status filter and the transition rules can all be exercised.
 * "Today" for the derived statuses is evaluated at read time by
 * `jobPostDisplayStatus`, not here.
 */

function post(
    id: number,
    agencyId: number,
    postedByUserId: number,
    jobTitle: string,
    jobSubcategoryId: number,
    workLocation: string,
    overrides: Partial<JobPostRecord> = {},
): JobPostRecord {
    return {
        id,
        agencyId,
        postedByUserId,
        recruitmentType: 'joborder',
        jobTitle,
        jobSubcategoryId,
        workLocation,
        vacantPositions: 3,
        contractType: 'fixed',
        salaryCurrency: 'SAR',
        monthlySalaryMin: 2500,
        monthlySalaryMax: 3200,
        educationLevel: 'vocational',
        minExperienceYears: 0,
        maxExperienceYears: 5,
        genderRequirement: 'any',
        jobDescription:
            '**Install** and maintain electrical systems across the site, following the maintenance schedule and reporting faults to the supervisor.',
        otherRequirements: 'Bring your **NC II** certificate.',
        applicationInstructions: 'Apply through your account.',
        contactPersonName: 'Recruitment team',
        contactEmail: 'hiring@example.test',
        contactPhone: null,
        status: 'pending',
        closingDate: null,
        isUrgent: false,
        languages: [{ language: 'english', proficiency: 'fluent' }],
        createdAt: '2026-09-10T09:00:00.000Z',
        updatedAt: '2026-09-10T09:00:00.000Z',
        ...overrides,
    };
}

export function seedJobPosts(): JobPostRecord[] {
    return [
        // Active, no closing date (never expires).
        post(1, 1, 3, 'Electrician', 1, 'Riyadh, Saudi Arabia', {
            closingDate: '2026-12-31',
            isUrgent: true,
        }),
        // Active, closing soon.
        post(2, 1, 3, 'Registered Nurse', 8, 'Abu Dhabi, UAE', {
            educationLevel: 'bachelor',
            monthlySalaryMin: 4000,
            monthlySalaryMax: 5200,
            closingDate: '2026-11-15',
        }),
        // Expired: pending with a past closing date.
        post(3, 1, 4, 'Welder / Fabricator', 2, 'Doha, Qatar', {
            closingDate: '2026-08-30',
        }),
        // Closed by staff, closing date in the future.
        post(
            4,
            1,
            4,
            'Hotel Front Desk Associate',
            15,
            'Riyadh, Saudi Arabia',
            {
                status: 'closed',
                recruitmentType: 'manpooling',
                closingDate: '2026-12-01',
            },
        ),
        // Archived — hidden unless the Archived filter is chosen.
        post(5, 1, 3, 'Carpenter', 4, 'Riyadh, Saudi Arabia', {
            status: 'archived',
            closingDate: '2026-07-01',
        }),
        // Seabased agency.
        post(6, 3, 10, 'Chief Officer', 31, 'Singapore', {
            educationLevel: 'bachelor',
            monthlySalaryMin: 6000,
            monthlySalaryMax: 8000,
            salaryCurrency: 'USD',
            closingDate: '2026-12-20',
        }),
        post(7, 3, 10, 'Chief Cook', 43, 'Miami, United States', {
            salaryCurrency: 'USD',
            monthlySalaryMin: 2200,
            monthlySalaryMax: 2800,
            closingDate: '2026-09-10',
        }),
        // Second agency, so the agency filter has more than one option.
        post(8, 2, 7, 'Caregiver', 10, 'Abu Dhabi, UAE', {
            educationLevel: 'secondary',
            monthlySalaryMin: 1800,
            monthlySalaryMax: 2400,
            salaryCurrency: 'AED',
            closingDate: '2026-11-30',
        }),
    ];
}

/**
 * Screening questions. `answerCount` drives the §8.4 rule: a question that
 * already has answers is archived and replaced, never edited.
 */
export function seedJobPostQuestions(): JobPostQuestionRecord[] {
    return [
        {
            id: 1,
            jobPostId: 1,
            questionText:
                'Do you hold a valid NC II certificate for electrical work?',
            answerType: 'yesno',
            expectedAnswer: 'yes',
            isRequired: true,
            sortOrder: 0,
            answerCount: 4,
            deletedAt: null,
        },
        {
            id: 2,
            jobPostId: 1,
            questionText: 'How many years of overseas experience do you have?',
            answerType: 'short',
            expectedAnswer: null,
            isRequired: false,
            sortOrder: 1,
            answerCount: 4,
            deletedAt: null,
        },
        {
            id: 3,
            jobPostId: 1,
            questionText:
                'Describe a fault you diagnosed under a tight schedule.',
            answerType: 'paragraph',
            expectedAnswer: null,
            isRequired: false,
            sortOrder: 2,
            answerCount: 0,
            deletedAt: null,
        },
        {
            id: 4,
            jobPostId: 2,
            questionText: 'Are you currently licensed to practise nursing?',
            answerType: 'yesno',
            expectedAnswer: 'yes',
            isRequired: true,
            sortOrder: 0,
            answerCount: 2,
            deletedAt: null,
        },
        {
            id: 5,
            jobPostId: 6,
            questionText: 'Do you hold a valid OOW certificate of competency?',
            answerType: 'yesno',
            expectedAnswer: 'yes',
            isRequired: true,
            sortOrder: 0,
            answerCount: 0,
            deletedAt: null,
        },
    ];
}
