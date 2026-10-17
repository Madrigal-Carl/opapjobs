/**
 * Applicant-side application shapes.
 *
 * Separate from `types/application.ts`, which models the application records
 * an agency advances through its pipeline. Nothing here is read by the
 * employer side.
 */

import type { JobQuestion } from './job';

/** A single question answer. Arrays back the multi-select question type. */
export type ApplicationAnswer = string | string[];

export type UploadedResume = {
    name: string;
    size: string;
};

export type ApplicationDraft = {
    /** Chosen from the applicant's own document library. */
    resumeId: string | null;
    uploadedResume: UploadedResume | null;
    coverLetter: string;
    salary: string;
    availability: string;
    answers: Record<string, ApplicationAnswer>;
};

/** The tabs on My Jobs, and the activity list behind each one. */
export type ApplicationTab = 'applied' | 'saved' | 'archived';

export type ApplicationActivity = Record<ApplicationTab, string[]>;

export type MatchCategory = {
    label: string;
    score: number;
};

export type MatchAnalysis = {
    overall: number;
    categories: MatchCategory[];
    strengths: string[];
    gaps: string[];
    tips: string[];
};

/** Colour band for a score. Kept as a token name, not a class. */
export type MatchTone = 'teal' | 'amber' | 'navy' | 'slate';

export type CoverLetterChip = {
    /** Stable key for the chip's `data-testid`. */
    slug: string;
    label: string;
    snippet: string;
};

/** The steps of the apply wizard, in order. */
export const APPLICATION_STEPS = [
    'Match analysis',
    'Application',
    'Review & submit',
] as const;

export type ApplicationStep = 1 | 2 | 3;

/**
 * Required answers block the wizard from moving on, so every unanswered
 * question is reported to the applicant at once.
 */
export function missingRequiredAnswers(
    questions: JobQuestion[],
    answers: Record<string, ApplicationAnswer>,
): JobQuestion[] {
    return questions.filter((question) => {
        if (!question.required) {
            return false;
        }

        const value = answers[question.id];

        if (Array.isArray(value)) {
            return value.length === 0;
        }

        return !value || !value.trim();
    });
}

export type { JobQuestion };
