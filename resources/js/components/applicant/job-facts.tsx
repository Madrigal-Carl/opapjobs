import {
    BadgeCheck,
    Briefcase,
    BriefcaseBusiness,
    Building2,
    CalendarClock,
    FileText,
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
    GENDER_LABELS,
    PROFICIENCY_LABELS,
    categoryLabel,
    closingLabel,
    experienceRangeLabel,
} from '@/data/job-attributes';
import type { LucideIcon } from 'lucide-react';
import type {
    PublicJobPostDetail,
    PublicJobPostPreview,
} from '@/types/public-catalog';

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
    | 'languages'
    | 'jobOrder'
    | 'employerLocation'
    | 'employerLicense';

/**
 * The facts the sticky header strip already puts above the fold. The browse
 * preview omits these so nothing is shown twice on one screen.
 */
export const JOB_FACT_OVERVIEW: JobFactKey[] = [
    'location',
    'salary',
    'applyBy',
];

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
 * Shared by the browse preview and the full listing so the two can never
 * disagree about what a role requires.
 */
export function JobFacts({
    job,
    omit = [],
}: {
    job: PublicJobPostPreview | PublicJobPostDetail;
    omit?: JobFactKey[];
}) {
    // Present only on the full job profile, and only for job orders.
    const jobOrderNumber = 'jobOrderNumber' in job ? job.jobOrderNumber : null;
    const employer = 'employerDetails' in job ? job.employerDetails : null;

    const facts: FactEntry[] = [
        {
            key: 'location',
            icon: MapPin,
            label: 'Location',
            value: job.location,
        },
        { key: 'salary', icon: Landmark, label: 'Salary', value: job.salary },
        {
            key: 'category',
            icon: Hash,
            label: 'Category',
            value:
                categoryLabel({
                    category: job.category ?? undefined,
                    subCategory: job.subCategory ?? undefined,
                }) || 'Not specified',
        },
        {
            key: 'contract',
            icon: Briefcase,
            label: 'Contract',
            value: CONTRACT_LABELS[job.contractType] ?? 'Not specified',
        },
        {
            key: 'applyBy',
            icon: CalendarClock,
            label: 'Apply by',
            value: closingLabel(job.closingDate ?? undefined),
        },
        {
            key: 'slots',
            icon: UsersRound,
            label: 'Slots',
            value: `${job.vacantPositions} ${
                job.vacantPositions === 1 ? 'position' : 'positions'
            }`,
        },
        {
            key: 'education',
            icon: GraduationCap,
            label: 'Education',
            value: EDUCATION_LABELS[job.educationLevel] ?? 'Not specified',
        },
        {
            key: 'experience',
            icon: BriefcaseBusiness,
            label: 'Experience',
            value:
                experienceRangeLabel({
                    minExperienceYears: job.minExperienceYears ?? undefined,
                    maxExperienceYears: job.maxExperienceYears ?? undefined,
                }) || 'Not specified',
        },
        {
            key: 'gender',
            icon: UsersRound,
            label: 'Gender',
            value: GENDER_LABELS[job.genderRequirement],
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
        ...(jobOrderNumber
            ? [
                  {
                      key: 'jobOrder' as const,
                      icon: FileText,
                      label: 'Job order',
                      value: jobOrderNumber,
                  },
              ]
            : []),
        ...(employer
            ? [
                  {
                      key: 'employerLocation' as const,
                      icon: Building2,
                      label: 'Employer location',
                      value: employer.location,
                  },
                  {
                      key: 'employerLicense' as const,
                      icon: BadgeCheck,
                      label: 'Employer licence',
                      value: employer.licenseNumber,
                  },
              ]
            : []),
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
