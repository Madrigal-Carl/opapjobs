import type {
    ApplicationAnswerRecord,
    ApplicationRecord,
    ApplicationStageHistoryRecord,
} from '../types';

/**
 * Applications, their answers and the append-only stage history (§10).
 *
 * The history is seeded so the detail timeline is meaningful on first load;
 * any stage change the console makes appends to it and never rewrites it
 * (§10.3).
 */

export function seedApplications(): ApplicationRecord[] {
    const base = '2026-10-01T09:00:00.000Z';

    return [
        {
            id: 1,
            jobPostId: 1,
            applicantUserId: 12,
            resumeDocumentId: 1,
            coverLetter:
                'Eight years of electrical work across marine and landbased environments, available to start immediately.',
            expectedMonthlySalary: 3000,
            availability: 'immediately',
            stage: 'interview',
            submittedAt: base,
            applicantArchivedAt: null,
        },
        {
            id: 2,
            jobPostId: 2,
            applicantUserId: 13,
            resumeDocumentId: 3,
            coverLetter:
                'PRC-licensed nurse with five years of ICU experience.',
            expectedMonthlySalary: 4800,
            availability: 'within_2_weeks',
            stage: 'reviewed',
            submittedAt: '2026-10-03T09:00:00.000Z',
            applicantArchivedAt: null,
        },
        {
            id: 3,
            jobPostId: 6,
            applicantUserId: 16,
            resumeDocumentId: 5,
            coverLetter: 'Two contracts as AB seaman, ready to sign on.',
            expectedMonthlySalary: 7000,
            availability: 'immediately',
            stage: 'applied',
            submittedAt: '2026-10-08T09:00:00.000Z',
            applicantArchivedAt: null,
        },
        {
            id: 4,
            jobPostId: 8,
            applicantUserId: 15,
            resumeDocumentId: null,
            coverLetter: null,
            expectedMonthlySalary: null,
            availability: 'more_than_1_month',
            stage: 'hired',
            submittedAt: '2026-09-20T09:00:00.000Z',
            applicantArchivedAt: null,
        },
        {
            id: 5,
            jobPostId: 1,
            applicantUserId: 17,
            resumeDocumentId: null,
            coverLetter: 'Six years of structural and pipe welding.',
            expectedMonthlySalary: 2900,
            availability: null,
            stage: 'pending',
            submittedAt: '2026-10-11T09:00:00.000Z',
            applicantArchivedAt: null,
        },
        {
            id: 6,
            jobPostId: 1,
            applicantUserId: 14,
            resumeDocumentId: null,
            coverLetter: null,
            expectedMonthlySalary: null,
            availability: 'within_1_month',
            stage: 'applied',
            submittedAt: '2026-10-12T09:00:00.000Z',
            applicantArchivedAt: '2026-10-14T09:00:00.000Z',
        },
    ];
}

/** Seeded so an appends-only timeline has a history to show. */
export function seedStageHistory(): ApplicationStageHistoryRecord[] {
    return [
        {
            id: 1,
            applicationId: 1,
            fromStage: null,
            toStage: 'applied',
            changedByUserId: null,
            note: null,
            createdAt: '2026-10-01T09:00:00.000Z',
        },
        {
            id: 2,
            applicationId: 1,
            fromStage: 'applied',
            toStage: 'reviewed',
            changedByUserId: 3,
            note: 'Documents match the job post requirements.',
            createdAt: '2026-10-04T09:00:00.000Z',
        },
        {
            id: 3,
            applicationId: 1,
            fromStage: 'reviewed',
            toStage: 'interview',
            changedByUserId: 2,
            note: 'Interview scheduled for next week.',
            createdAt: '2026-10-09T09:00:00.000Z',
        },
        {
            id: 4,
            applicationId: 2,
            fromStage: null,
            toStage: 'applied',
            changedByUserId: null,
            note: null,
            createdAt: '2026-10-03T09:00:00.000Z',
        },
        {
            id: 5,
            applicationId: 2,
            fromStage: 'applied',
            toStage: 'reviewed',
            changedByUserId: 3,
            note: null,
            createdAt: '2026-10-05T09:00:00.000Z',
        },
        {
            id: 6,
            applicationId: 4,
            fromStage: null,
            toStage: 'applied',
            changedByUserId: null,
            note: null,
            createdAt: '2026-09-20T09:00:00.000Z',
        },
        {
            id: 7,
            applicationId: 4,
            fromStage: 'applied',
            toStage: 'hired',
            changedByUserId: 6,
            note: 'Contract signed.',
            createdAt: '2026-09-28T09:00:00.000Z',
        },
    ];
}

export function seedApplicationAnswers(): ApplicationAnswerRecord[] {
    return [
        {
            id: 1,
            applicationId: 1,
            jobPostQuestionId: 1,
            answerText: 'Yes',
        },
        {
            id: 2,
            applicationId: 1,
            jobPostQuestionId: 2,
            answerText: 'Three years in Saudi, two at sea.',
        },
        {
            id: 3,
            applicationId: 2,
            jobPostQuestionId: 4,
            answerText: 'Yes',
        },
        {
            id: 4,
            applicationId: 5,
            jobPostQuestionId: 1,
            answerText: 'Yes',
        },
    ];
}
