import type { OverviewDayPoint } from '@/types/overview';

const DAY_VALUES = [
    1, 0, 2, 1, 3, 0, 1, 2, 0, 1, 3, 1, 2, 0, 1, 4, 2, 1, 3, 0, 2, 1, 4, 2, 1,
    3, 0, 2,
];

const HIRED_DAYS = [8, 21];
const REVIEWED_DAYS = [2, 4, 5, 9, 12, 15, 18, 20, 22, 24, 25, 27];
const INTERVIEW_DAYS = [6, 11, 17, 23, 26];

export const overviewDays: OverviewDayPoint[] = DAY_VALUES.map(
    (applications, index) => ({
        date: `2026-02-${String(index + 1).padStart(2, '0')}`,
        applications,
        hired: HIRED_DAYS.includes(index + 1) ? 1 : 0,
        reviewed: REVIEWED_DAYS.includes(index + 1) ? 1 : 0,
        interview: INTERVIEW_DAYS.includes(index + 1) ? 1 : 0,
    }),
);
