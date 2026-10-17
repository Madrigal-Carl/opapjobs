/**
 * Match analysis for the first step of the apply wizard.
 *
 * Every score is derived from the same fields the agency captured on the
 * posting form, compared against the applicant's own resume. Nothing is
 * random: when a listing changes or a profile is edited the report follows,
 * and swapping this for a real scoring service later only means replacing the
 * bodies of these functions.
 */
import { getPublicEmployer, getPublicLocation } from '@/data/job-attributes';
import type {
    MatchAnalysis,
    MatchCategory,
    MatchTone,
} from '@/types/application-draft';
import type { ApplicantProfile, SkillLevel } from '@/types/applicant-profile';
import type { EducationLevel, Job, LanguageProficiency } from '@/types/job';

/** Education levels, weakest first, so they can be compared by rank. */
const EDUCATION_RANK: Record<EducationLevel, number> = {
    any: 0,
    secondary: 1,
    vocational: 2,
    bachelor: 3,
    master: 4,
};

/** Skill levels mapped onto the same 0–1 scale. */
const SKILL_RANK: Record<SkillLevel, number> = {
    Beginner: 0.25,
    Intermediate: 0.5,
    Advanced: 0.75,
    Expert: 1,
};

const PROFICIENCY_RANK: Record<LanguageProficiency, number> = {
    basic: 0.34,
    conversational: 0.67,
    fluent: 1,
};

/** Caps every category so one very long resume cannot score 100% overall. */
function clamp(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

/** Normalises a value into comparable word tokens. */
function tokens(value: string): string[] {
    return value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 2);
}

/**
 * Years covered by the applicant's career history. Free-text dates such as
 * "Mar 2021" are parsed where possible; an unparseable entry still counts as
 * a year so a partial history is not scored as no history.
 */
function totalExperienceYears(profile: ApplicantProfile): number {
    const now = new Date().getFullYear();

    return profile.experiences.reduce((total, entry) => {
        const start = parseYear(entry.start);
        const end = entry.end ? parseYear(entry.end) : now;

        if (start === null || end === null || end <= start) {
            return total + 1;
        }

        return total + Math.min(end - start, 40);
    }, 0);
}

function parseYear(value: string): number | null {
    const match = value.match(/(\d{4})/);

    return match ? Number.parseInt(match[1], 10) : null;
}

/** The applicant's highest education, by rank. */
function highestEducation(profile: ApplicantProfile): number {
    return profile.education.reduce((rank, entry) => {
        if (/master|phd|doctor/i.test(entry.degree)) {
            return Math.max(rank, EDUCATION_RANK.master);
        }

        if (/bachelor|bs|bsa|bsn/i.test(entry.degree)) {
            return Math.max(rank, EDUCATION_RANK.bachelor);
        }

        if (/nc|tesda|vocational/i.test(entry.degree)) {
            return Math.max(rank, EDUCATION_RANK.vocational);
        }

        return Math.max(rank, EDUCATION_RANK.secondary);
    }, EDUCATION_RANK.secondary);
}

/**
 * How much of the posting's own vocabulary the applicant's skills and career
 * history already cover. A welder applying to a welding role scores far
 * higher here than the same profile against an unrelated listing.
 */
function skillsScore(job: Job, profile: ApplicantProfile): number {
    const wanted = new Set([
        ...tokens(job.subCategory),
        ...tokens(job.category),
        ...tokens(job.title),
    ]);

    if (wanted.size === 0) {
        return 70;
    }

    const owned: string[] = [];

    for (const skill of profile.skills) {
        owned.push(...tokens(skill.name));
    }

    for (const entry of profile.experiences) {
        owned.push(...tokens(entry.role), ...tokens(entry.description));
    }

    const hits = [...wanted].filter((token) =>
        owned.some(
            (candidate) =>
                candidate.includes(token) || token.includes(candidate),
        ),
    ).length;

    // Two thirds from keyword coverage, a third from declared skill strength.
    const coverage = (hits / wanted.size) * 66;
    const strength =
        (profile.skills.reduce(
            (sum, skill) => sum + SKILL_RANK[skill.level],
            0,
        ) /
            Math.max(profile.skills.length, 1)) *
        34;

    return clamp(coverage + strength);
}

function certificationsScore(profile: ApplicantProfile): number {
    const now = new Date();
    const valid = profile.certifications.filter((cert) => {
        if (!cert.expiryDate) {
            return true;
        }

        const expiry = new Date(`${cert.expiryDate}T23:59:59`);

        return Number.isNaN(expiry.getTime()) || expiry >= now;
    });

    if (valid.length === 0) {
        return 25;
    }

    // Three current certificates is treated as a full set.
    return clamp(45 + (valid.length / 3) * 55);
}

function languagesScore(job: Job, profile: ApplicantProfile): number {
    const wanted = job.languages ?? [];

    if (wanted.length === 0) {
        return 80;
    }

    // The profile has no explicit language list, so evidence is drawn from
    // the summary and career history mentioning the language.
    const evidence = [
        profile.summary,
        ...profile.experiences.map(
            (entry) => `${entry.role} ${entry.description}`,
        ),
    ]
        .join(' ')
        .toLowerCase();

    const met = wanted.filter((entry) =>
        evidence.includes(entry.language.toLowerCase()),
    );

    const demanded = wanted.reduce(
        (sum, entry) => sum + PROFICIENCY_RANK[entry.proficiency],
        0,
    );
    const metWeight = met.reduce(
        (sum, entry) => sum + PROFICIENCY_RANK[entry.proficiency],
        0,
    );
    const ratio = demanded > 0 ? metWeight / demanded : 0;

    return clamp(40 + (met.length / wanted.length) * 30 + ratio * 30);
}

/**
 * Readiness rather than a hard gate: can the applicant start, and is their
 * profile complete enough for the agency to act on.
 */
function availabilityScore(profile: ApplicantProfile): number {
    const readiness = [
        profile.summary.trim(),
        profile.phone.trim(),
        profile.documents.length,
        profile.experiences.length,
        profile.coverLetter.trim(),
    ].filter(Boolean).length;

    return clamp(30 + (readiness / 5) * 70);
}

/** Whether the applicant's most recent role sits in the same discipline. */
function trajectoryScore(job: Job, profile: ApplicantProfile): number {
    const [latest] = profile.experiences;

    if (!latest) {
        return 30;
    }

    const wanted = new Set([
        ...tokens(job.category),
        ...tokens(job.subCategory),
    ]);
    const held = [...tokens(latest.role), ...tokens(latest.description)];
    const overlap = [...wanted].filter((token) =>
        held.some((candidate) => candidate.includes(token)),
    ).length;

    const continuity = Math.min(profile.experiences.length / 3, 1) * 30;

    return clamp((wanted.size ? overlap / wanted.size : 0.5) * 70 + continuity);
}

/**
 * How the applicant's total years sit against the band the agency asked for.
 * Inside the band scores highest; over-qualified is lightly penalised so a
 * long-serving applicant is not told they are a poor match.
 */
function experienceScore(job: Job, years: number): number {
    const required = job.minExperienceYears ?? 0;

    if (required === 0) {
        return clamp(55 + Math.min(years / 10, 1) * 35);
    }

    const ceiling = job.maxExperienceYears ?? required + 8;

    if (years > ceiling) {
        return clamp(85 - (years - ceiling) * 4);
    }

    if (years < required) {
        return clamp(30 + (years / required) * 45);
    }

    // Inside the band: closest to the stated minimum scores highest.
    const spread = Math.max(ceiling - required, 1);

    return clamp(70 + (1 - (years - required) / spread) * 25);
}

/** The applicant's qualification level against the one the listing wants. */
function educationScore(job: Job, profile: ApplicantProfile): number {
    const required = EDUCATION_RANK[job.education ?? 'any'];

    if (required === 0) {
        return clamp(60 + Math.min(highestEducation(profile) / 4, 1) * 35);
    }

    return clamp(45 + Math.min(highestEducation(profile) / required, 1) * 55);
}

export function generateMatchAnalysis(
    job: Job,
    profile: ApplicantProfile,
): MatchAnalysis {
    const years = totalExperienceYears(profile);

    const categories: MatchCategory[] = [
        { label: 'Education', score: educationScore(job, profile) },
        { label: 'Experience', score: experienceScore(job, years) },
        { label: 'Skills', score: skillsScore(job, profile) },
        { label: 'Certifications', score: certificationsScore(profile) },
        { label: 'Languages', score: languagesScore(job, profile) },
        {
            label: 'Availability & Location',
            score: availabilityScore(profile),
        },
        { label: 'Career Trajectory', score: trajectoryScore(job, profile) },
    ];

    const overall = clamp(
        categories.reduce((sum, item) => sum + item.score, 0) /
            categories.length,
    );

    return {
        overall,
        categories,
        strengths: describeStrengths(job, profile, categories, years),
        gaps: describeGaps(job, profile, categories, years),
        tips: describeTips(job, profile, categories),
    };
}

function describeStrengths(
    job: Job,
    profile: ApplicantProfile,
    categories: MatchCategory[],
    years: number,
): string[] {
    const strengths: string[] = [];
    const strongest = [...categories].sort((a, b) => b.score - a.score);

    for (const category of strongest.slice(0, 2)) {
        strengths.push(`${category.label} matches at ${category.score}%`);
    }

    if ((job.minExperienceYears ?? 0) > 0) {
        strengths.push(
            `${years} years of experience against a ${job.minExperienceYears}-year minimum`,
        );
    }

    if (profile.certifications.length > 0) {
        strengths.push(
            `${profile.certifications.length} certification${
                profile.certifications.length === 1 ? '' : 's'
            } on file`,
        );
    }

    return strengths;
}

function describeGaps(
    job: Job,
    profile: ApplicantProfile,
    categories: MatchCategory[],
    years: number,
): string[] {
    const gaps: string[] = [];
    const weakest = [...categories].sort((a, b) => a.score - b.score);

    for (const category of weakest.slice(0, 2)) {
        if (category.score < 70) {
            gaps.push(`${category.label} scores lowest at ${category.score}%`);
        }
    }

    const required = job.minExperienceYears ?? 0;

    if (required > 0 && years < required) {
        gaps.push(
            `This listing asks for ${required} years; your resume shows ${years}`,
        );
    }

    if (
        required &&
        EDUCATION_RANK[job.education ?? 'any'] > highestEducation(profile)
    ) {
        gaps.push('The listing asks for a qualification above your highest');
    }

    if (profile.documents.length === 0) {
        gaps.push('No resume document is attached to your profile yet');
    }

    if (gaps.length === 0) {
        gaps.push('No blocking gaps found — review the listing before sending');
    }

    return gaps;
}

function describeTips(
    job: Job,
    profile: ApplicantProfile,
    categories: MatchCategory[],
): string[] {
    const tips: string[] = [];
    const strongest = [...categories].sort((a, b) => b.score - a.score)[0];

    if (strongest) {
        tips.push(
            `Lead your cover letter with ${strongest.label.toLowerCase()}, your strongest area on paper`,
        );
    }

    if (job.questions?.length) {
        const count = job.questions.length;

        tips.push(
            count === 1
                ? 'The agency asks one question — answer it directly'
                : `The agency asks ${count} questions — answer every one`,
        );
    }

    if (!profile.coverLetter.trim()) {
        tips.push('Draft a cover letter before you review the application');
    }

    return tips;
}

/** Label and colour band for the headline score. */
export function overallMatchMeta(score: number): {
    label: string;
    tone: MatchTone;
} {
    if (score >= 90) {
        return { label: 'Excellent match', tone: 'amber' };
    }

    if (score >= 75) {
        return { label: 'Very good match', tone: 'teal' };
    }

    if (score >= 60) {
        return { label: 'Good match', tone: 'navy' };
    }

    return { label: 'Fair match', tone: 'slate' };
}

/** Colour band for a single category bar. */
export function categoryTone(score: number): MatchTone {
    if (score >= 80) {
        return 'teal';
    }

    if (score >= 60) {
        return 'amber';
    }

    return 'slate';
}

/** The employer an applicant is shown, respecting the manpooling redaction. */
export function describeEmployer(job: Job): string {
    return (
        getPublicEmployer(job)?.name ?? `${job.agency} · confidential employer`
    );
}

/** The location an applicant is shown, respecting the redaction. */
export function describeLocation(job: Job): string {
    return getPublicLocation(job);
}

/** Tone classes for a category bar, keyed by the tone name. */
export const MATCH_TONE_TEXT: Record<MatchTone, string> = {
    teal: 'text-[var(--teal)]',
    amber: 'text-[var(--amber)]',
    navy: 'text-[var(--navy)]',
    slate: 'text-[var(--slate)]',
};

export const MATCH_TONE_BAR: Record<MatchTone, string> = {
    teal: 'bg-[var(--teal)]',
    amber: 'bg-[var(--amber)]',
    navy: 'bg-[var(--navy)]',
    slate: 'bg-[var(--slate)]',
};
