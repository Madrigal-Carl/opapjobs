import { Head, Link } from '@inertiajs/react';
import { Bookmark, BookmarkX, Check, MapPin, Wallet } from 'lucide-react';
import { useState } from 'react';
import { ApplicantScope } from '@/components/applicant/applicant-scope';
import { Button } from '@/components/ui/button';
import { useApplications } from '@/contexts/applications-context';
import { closingUrgencyLabel } from '@/data/job-attributes';
import { profile } from '@/routes';
import {
    index as jobsIndex,
    show as jobShow,
    apply as jobApply,
} from '@/routes/jobs';
import type { ApplicationTab } from '@/types/application-draft';
import {
    APPLICATION_STAGE_LABELS,
    type ApplicationStageValue,
} from '@/types/dashboard-application';
import type { ApplicantJobPost } from '@/types/public-catalog';

type MyJobsTab = Exclude<ApplicationTab, 'archived'>;

type MyJobsProps = Record<MyJobsTab, ApplicantJobPost[]>;

/**
 * The two tabs, in the database's terms: Applied is every application the
 * applicant sent, Saved is `saved_job_posts`.
 */
const TABS: { id: MyJobsTab; label: string; empty: string }[] = [
    {
        id: 'applied',
        label: 'Applied',
        empty: 'Nothing sent yet. When you apply for a role it lands here so you can track it.',
    },
    {
        id: 'saved',
        label: 'Saved',
        empty: 'No roles bookmarked yet. Tap the bookmark on any job post to keep it here.',
    },
];

/**
 * The forward path an application takes through the agency, in order.
 * `not_selected` leaves the path, so it is shown as a notice instead.
 */
const STAGE_TRACK: {
    stage: ApplicationStageValue;
    label: string;
    hint: string;
}[] = [
    {
        stage: 'pending',
        label: 'Sent',
        hint: 'The agency has your profile and resumé.',
    },
    {
        stage: 'reviewed',
        label: 'Reviewed',
        hint: 'A recruiter has read your application.',
    },
    {
        stage: 'shortlisted',
        label: 'Shortlisted',
        hint: 'You are on the list for the employer.',
    },
    {
        stage: 'for_interview',
        label: 'Interview',
        hint: 'Expect a call or message to schedule it.',
    },
    {
        stage: 'endorsed',
        label: 'Endorsed',
        hint: 'Put forward to the employer for hiring.',
    },
];

/** My Jobs: the applicant's applications and saved job posts, from the database. */
export default function MyJobs(props: MyJobsProps) {
    return (
        <ApplicantScope>
            <MyJobsBody {...props} />
        </ApplicantScope>
    );
}

function MyJobsBody(rows: MyJobsProps) {
    const [tab, setTab] = useState<MyJobsTab>('applied');

    const counts: Record<MyJobsTab, number> = {
        applied: rows.applied.length,
        saved: rows.saved.length,
    };

    const inProgress = rows.applied.filter(
        (job) =>
            job.applicationStage !== 'not_selected' &&
            job.applicationStage !== 'endorsed',
    ).length;

    const current = rows[tab];
    const tabCopy = TABS.find((item) => item.id === tab);

    return (
        <>
            <Head>
                <title>
                    {`My Jobs — ${counts.applied} applied, ${counts.saved} saved | OPAP Job Abroad`}
                </title>
            </Head>

            <section className="myjobs-hero">
                <div className="shell">
                    <div className="myjobs-hero-inner">
                        <div>
                            <div className="eyebrow eyebrow-light">
                                <span className="eyebrow-rule" /> MY JOBS
                            </div>
                            <h1>Track every application</h1>
                            <p>
                                Where each application stands with the agency,
                                and the roles you saved for later.
                            </p>
                        </div>

                        <dl className="myjobs-stats">
                            <div>
                                <dt>Applied</dt>
                                <dd>{counts.applied}</dd>
                            </div>
                            <div>
                                <dt>In progress</dt>
                                <dd>{inProgress}</dd>
                            </div>
                            <div>
                                <dt>Saved</dt>
                                <dd>{counts.saved}</dd>
                            </div>
                        </dl>
                    </div>

                    <div
                        className="myjobs-tabs"
                        role="tablist"
                        aria-label="My Jobs"
                    >
                        {TABS.map(({ id, label }) => (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                className="myjobs-tab"
                                aria-selected={tab === id}
                                onClick={() => setTab(id)}
                                data-testid={`tab-applications-${id}`}
                            >
                                {label}
                                <span className="myjobs-tab-count">
                                    {counts[id]}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="myjobs-body">
                <div className="shell">
                    <div className="myjobs-columns">
                        <div className="myjobs-main" role="tabpanel">
                            <div className="myjobs-toolbar">
                                <p>
                                    {current.length === 0
                                        ? `${tabCopy?.label} is empty`
                                        : 'Most recent first'}
                                </p>
                                <Button asChild variant="secondary" size="sm">
                                    <Link href={jobsIndex.url()}>
                                        Browse jobs
                                    </Link>
                                </Button>
                            </div>

                            {current.length === 0 ? (
                                <div
                                    className="myjobs-empty"
                                    data-testid={`empty-applications-${tab}`}
                                >
                                    <span aria-hidden="true">
                                        {tab === 'applied' ? (
                                            <Check size={24} />
                                        ) : (
                                            <Bookmark size={24} />
                                        )}
                                    </span>
                                    <h2>{tabCopy?.label} is empty</h2>
                                    <p>{tabCopy?.empty}</p>
                                    <Button asChild>
                                        <Link href={jobsIndex.url()}>
                                            Browse verified jobs
                                        </Link>
                                    </Button>
                                </div>
                            ) : (
                                current.map((job) => (
                                    <JobCard key={job.id} job={job} tab={tab} />
                                ))
                            )}
                        </div>

                        <aside className="myjobs-rail">
                            <div className="myjobs-rail-card">
                                <p className="myjobs-rail-title">
                                    How an application moves
                                </p>
                                <ol className="myjobs-legend">
                                    {STAGE_TRACK.map((step, index) => (
                                        <li key={step.stage}>
                                            <span aria-hidden="true">
                                                {index + 1}
                                            </span>
                                            <p>
                                                <strong>{step.label}</strong>
                                                {step.hint}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            <div className="myjobs-rail-card">
                                <p className="myjobs-rail-title">
                                    Keep your profile ready
                                </p>
                                <p className="myjobs-rail-copy">
                                    Agencies read your profile with every
                                    application. An up-to-date profile moves
                                    faster. Applications and saved jobs are kept
                                    with your account on every device.
                                </p>
                                <Button asChild variant="secondary" size="sm">
                                    <Link href={profile.url()}>
                                        Open my profile
                                    </Link>
                                </Button>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>
        </>
    );
}

function formatDate(iso: string | null): string {
    return iso
        ? new Date(iso).toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
          })
        : '';
}

function stageLabel(stage: string | null): string {
    return stage && stage in APPLICATION_STAGE_LABELS
        ? APPLICATION_STAGE_LABELS[stage as ApplicationStageValue]
        : 'Sent';
}

function JobCard({ job, tab }: { job: ApplicantJobPost; tab: MyJobsTab }) {
    const { isApplied, toggleSaved } = useApplications();
    const isClosed = !job.isAcceptingApplications;
    const urgency = isClosed
        ? ''
        : closingUrgencyLabel(job.closingDate ?? undefined);
    const isSaved = tab === 'saved';
    const isNotSelected = job.applicationStage === 'not_selected';
    const date = isSaved
        ? `Saved ${formatDate(job.savedAt)}`
        : `Applied ${formatDate(job.appliedAt)}`;

    return (
        <article
            className="myjobs-card"
            data-testid={`row-applications-${job.id}`}
        >
            <div className="myjobs-card-head">
                <span className="myjobs-tile" aria-hidden="true">
                    {job.agency.slice(0, 1).toUpperCase()}
                </span>
                <div className="myjobs-card-info">
                    <div className="myjobs-flags">
                        <span className="myjobs-flag">
                            {job.pathway === 'landbased'
                                ? 'Landbased'
                                : 'Seabased'}
                        </span>
                        {job.urgent && !isClosed && (
                            <span className="myjobs-flag is-urgent">
                                Urgent
                            </span>
                        )}
                        {isClosed && (
                            <span className="myjobs-flag is-closed">
                                Closed
                            </span>
                        )}
                    </div>
                    <h3>
                        <Link
                            href={jobShow.url(job.id)}
                            data-testid={`link-application-${job.id}`}
                        >
                            {job.title}
                        </Link>
                    </h3>
                    <p className="myjobs-agency">{job.agency}</p>
                    <p className="myjobs-meta">
                        <span>
                            <MapPin size={14} aria-hidden="true" />
                            {job.location}
                        </span>
                        <span>
                            <Wallet size={14} aria-hidden="true" />
                            {job.salary}
                        </span>
                        {urgency && (
                            <span className="myjobs-soon">{urgency}</span>
                        )}
                    </p>
                </div>
                {isSaved ? (
                    <span className="myjobs-pill is-muted">Saved</span>
                ) : (
                    <span
                        className={`myjobs-pill ${isNotSelected ? 'is-muted' : job.applicationStage === 'for_interview' || job.applicationStage === 'endorsed' ? 'is-strong' : ''}`}
                        data-testid={`status-application-${job.id}`}
                    >
                        {stageLabel(job.applicationStage)}
                    </span>
                )}
            </div>

            {!isSaved &&
                (isNotSelected ? (
                    <p className="myjobs-notice">
                        The agency went ahead with another applicant for this
                        role. Your profile stays on file for their next opening.
                    </p>
                ) : (
                    <StageTrack stage={job.applicationStage} />
                ))}

            <div className="myjobs-card-foot">
                <p className="myjobs-date">{date}</p>
                <div className="myjobs-actions">
                    <Button asChild variant="secondary" size="sm">
                        <Link
                            href={jobShow.url(job.id)}
                            data-testid={`link-application-view-${job.id}`}
                        >
                            View job post
                        </Link>
                    </Button>
                    {isSaved && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-sm!"
                            onClick={() => toggleSaved(job.id)}
                            aria-label={`Remove ${job.title} from saved jobs`}
                            data-testid={`button-unsave-${job.id}`}
                        >
                            <BookmarkX size={15} aria-hidden="true" /> Remove
                        </Button>
                    )}
                    {isSaved && !isClosed && !isApplied(job.id) && (
                        <Button asChild size="sm">
                            <Link
                                href={jobApply.url(job.id)}
                                data-testid={`link-application-apply-${job.id}`}
                            >
                                Apply now
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </article>
    );
}

/** Where an application sits on the agency's path, step by step. */
function StageTrack({ stage }: { stage: string | null }) {
    const reached = Math.max(
        0,
        STAGE_TRACK.findIndex((step) => step.stage === stage),
    );

    return (
        <ol
            className="myjobs-track"
            aria-label={`Application progress: ${stageLabel(stage)}`}
        >
            {STAGE_TRACK.map((step, index) => (
                <li
                    key={step.stage}
                    className={
                        // The last step reached is the end of the path, so it reads as done.
                        index < reached ||
                        (index === reached &&
                            reached === STAGE_TRACK.length - 1)
                            ? 'is-done'
                            : index === reached
                              ? 'is-current'
                              : ''
                    }
                    aria-current={index === reached ? 'step' : undefined}
                >
                    <span aria-hidden="true" />
                    {step.label}
                </li>
            ))}
        </ol>
    );
}
