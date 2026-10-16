import {
    Briefcase,
    BriefcaseBusiness,
    CalendarClock,
    GraduationCap,
    Hash,
    Landmark,
    Languages,
    MapPin,
    UsersRound,
} from 'lucide-react';
import {
    CONTRACT_LABELS,
    EDUCATION_LABELS,
    PROFICIENCY_LABELS,
    ageRangeLabel,
    categoryLabel,
    experienceRangeLabel,
    getPublicLocation,
} from '@/data/job-attributes';
import type { LucideIcon } from 'lucide-react';
import type { Job } from '@/types/job';

/** Stable identifiers so a caller can drop facts it already shows. */
export type JobFactKey =
    | 'location'
    | 'salary'
    | 'category'
    | 'contract'
    | 'applyBy'
    | 'slots'
    | 'education'
    | 'experience'
    | 'gender'
    | 'age'
    | 'languages';

/** The facts the sticky header strip already puts above the fold. */
export const JOB_FACT_OVERVIEW: JobFactKey[] = [
    'location',
    'salary',
    'applyBy',
];

function genderLabel(job: Job): string {
    if (job.gender === 'any') {
        return 'Any gender';
    }

    return job.gender === 'male' ? 'Male' : 'Female';
}

/** Formats an ISO closing date for applicant-facing key facts. */
function closingLabel(job: Job): string {
    if (!job.closingDate) {
        return 'Open';
    }

    const date = new Date(`${job.closingDate}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return job.closingDate;
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

type FactEntry = {
    key: JobFactKey;
    icon: LucideIcon;
    label: string;
    value: string;
};

/**
 * Every requirement the agency captured, in the order an applicant scans
 * them: where and what it pays first, then the criteria they are measured
 * against.
 *
 * Shared by the split-view preview and the full listing so the two can never
 * disagree about what a role requires. `omit` drops anything the surrounding
 * layout already shows.
 */
export function JobFacts({
    job,
    omit = [],
}: {
    job: Job;
    omit?: JobFactKey[];
}) {
    const age = ageRangeLabel(job);

    const facts: FactEntry[] = [
        {
            key: 'location',
            icon: MapPin,
            label: 'Location',
            value: getPublicLocation(job),
        },
        { key: 'salary', icon: Landmark, label: 'Salary', value: job.salary },
        {
            key: 'category',
            icon: Hash,
            label: 'Category',
            value: categoryLabel(job) || 'Not specified',
        },
        {
            key: 'contract',
            icon: Briefcase,
            label: 'Contract',
            value: job.contractDuration
                ? CONTRACT_LABELS[job.contractDuration]
                : 'Not specified',
        },
        {
            key: 'applyBy',
            icon: CalendarClock,
            label: 'Apply by',
            value: closingLabel(job),
        },
        {
            key: 'slots',
            icon: UsersRound,
            label: 'Slots',
            value: `${job.quantity} ${
                job.quantity === 1 ? 'position' : 'positions'
            }`,
        },
        {
            key: 'education',
            icon: GraduationCap,
            label: 'Education',
            value: job.education
                ? EDUCATION_LABELS[job.education]
                : 'Not specified',
        },
        {
            key: 'experience',
            icon: BriefcaseBusiness,
            label: 'Experience',
            value: experienceRangeLabel(job) || 'Not specified',
        },
        {
            key: 'gender',
            icon: UsersRound,
            label: 'Gender',
            value: genderLabel(job),
        },
        {
            key: 'age',
            icon: CalendarClock,
            label: 'Age',
            value: age ? `${age} years old` : 'No age preference',
        },
        {
            key: 'languages',
            icon: Languages,
            label: 'Languages',
            value: job.languages?.length
                ? job.languages
                      .map(
                          (entry) =>
                              `${entry.language} (${PROFICIENCY_LABELS[entry.proficiency]})`,
                      )
                      .join(', ')
                : 'Not specified',
        },
    ];

    const skip = new Set(omit);

    return (
        <dl className="job-facts-grid">
            {facts
                .filter((fact) => !skip.has(fact.key))
                .map(({ icon: Icon, label, value }) => (
                    <div className="job-fact" key={label}>
                        <dt className="job-fact-label">
                            <Icon size={14} aria-hidden="true" />
                            {label}
                        </dt>
                        <dd className="job-fact-value">{value}</dd>
                    </div>
                ))}
        </dl>
    );
}
