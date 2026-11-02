import { Head, Link } from '@inertiajs/react';
import { ArchiveRestore, Bookmark, Check, Clock3, MapPin } from 'lucide-react';
import { useState } from 'react';
import { ApplicantScope } from '@/components/applicant/applicant-scope';
import { Button } from '@/components/ui/button';
import { closingUrgencyLabel } from '@/data/job-attributes';
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

type MyJobsProps = Record<ApplicationTab, ApplicantJobPost[]>;

/**
 * The three tabs, in the database's terms: Applied and Archived are the
 * applicant's applications (Archived = `applicant_archived_at` set), Saved
 * is `saved_job_posts`.
 */
const TABS: { id: ApplicationTab; label: string; empty: string }[] = [
    {
        id: 'applied',
        label: 'Applied',
        empty: 'Nothing sent yet. When you apply for a role it lands here so you can track it.',
    },
    {
        id: 'saved',
        label: 'Saved',
        empty: 'No roles bookmarked yet. Saved job posts show up here.',
    },
    {
        id: 'archived',
        label: 'Archived',
        empty: 'Nothing archived. Applications you archive are kept here, out of your main list.',
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
    const [tab, setTab] = useState<ApplicationTab>('applied');

    const counts: Record<ApplicationTab, number> = {
        applied: rows.applied.length,
        saved: rows.saved.length,
        archived: rows.archived.length,
    };

    const current = rows[tab];
    const tabCopy = TABS.find((item) => item.id === tab);

    return (
        <>
            <Head>
                <title>
                    {`My Jobs — ${counts.applied} applied, ${counts.saved} saved | OPAP Job Abroad`}
                </title>
            </Head>

            <section className="applications-hero">
                <div className="shell applications-hero-inner">
                    <div>
                        <div className="eyebrow">
                            <span className="eyebrow-rule" /> MY JOBS
                        </div>
                        <h1>Everything you have set in motion.</h1>
                    </div>
                    <p>
                        Applications you have sent, job posts you saved, and the
                        applications you archived.
                    </p>
                </div>
            </section>

            <section className="applications-section">
                <div className="shell">
                    <div className="applications-toolbar">
                        <div
                            className="applications-tabs"
                            role="tablist"
                            aria-label="My Jobs"
                        >
                            {TABS.map(({ id, label }) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    className={`applications-tab ${tab === id ? 'is-active' : ''}`}
                                    aria-selected={tab === id}
                                    onClick={() => setTab(id)}
                                    data-testid={`tab-applications-${id}`}
                                >
                                    {label}
                                    <span className="applications-tab-count">
                                        {counts[id]}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <Button asChild variant="secondary" size="sm">
                            <Link href={jobsIndex.url()}>Browse jobs</Link>
                        </Button>
                    </div>

                    {current.length === 0 ? (
                        <div
                            className="applications-empty"
                            data-testid={`empty-applications-${tab}`}
                        >
                            {tab === 'applied' ? (
                                <Check size={26} aria-hidden="true" />
                            ) : tab === 'saved' ? (
                                <Bookmark size={26} aria-hidden="true" />
                            ) : (
                                <ArchiveRestore size={26} aria-hidden="true" />
                            )}
                            <h2>{tabCopy?.label} is empty</h2>
                            <p>{tabCopy?.empty}</p>
                            <Button asChild>
                                <Link href={jobsIndex.url()}>
                                    Browse verified jobs
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="applications-panel">
                            {current.map((job) => (
                                <ApplicationRow
                                    key={job.id}
                                    job={job}
                                    tab={tab}
                                />
                            ))}
                        </div>
                    )}

                    <p className="applications-end">
                        <Clock3 size={13} aria-hidden="true" />
                        Your applications and saved job posts are kept with your
                        account, so they show on every device you sign in on.
                    </p>
                </div>
            </section>
        </>
    );
}

function stageLabel(stage: string | null): string {
    return stage && stage in APPLICATION_STAGE_LABELS
        ? APPLICATION_STAGE_LABELS[stage as ApplicationStageValue]
        : 'Sent';
}

function ApplicationRow({
    job,
    tab,
}: {
    job: ApplicantJobPost;
    tab: ApplicationTab;
}) {
    const isClosed = !job.isAcceptingApplications;
    const urgency = isClosed
        ? ''
        : closingUrgencyLabel(job.closingDate ?? undefined);

    return (
        <div
            className="application-row"
            data-testid={`row-applications-${job.id}`}
        >
            <div className="application-row-main">
                <div className="job-card-flags">
                    <span className="job-type">
                        {job.pathway === 'landbased' ? 'Landbased' : 'Seabased'}
                    </span>
                    {job.urgent && !isClosed && (
                        <span className="jobs-card-label urgent">Urgent</span>
                    )}
                    {isClosed && (
                        <span className="jobs-card-label">Closed</span>
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

                <p className="jobs-card-agency">{job.agency}</p>

                <p className="application-row-meta">
                    <MapPin size={13} aria-hidden="true" />
                    {job.location}
                    <span className="application-row-dot" />
                    {job.salary}
                    {urgency && (
                        <span className="job-closing-soon">{urgency}</span>
                    )}
                </p>
            </div>

            <div className="application-row-actions">
                <Link
                    className="job-view-link"
                    href={jobShow.url(job.id)}
                    data-testid={`link-application-view-${job.id}`}
                >
                    View job post
                </Link>

                {tab === 'saved' ? (
                    !isClosed && (
                        <Link
                            className="job-view-link"
                            href={jobApply.url(job.id)}
                            data-testid={`link-application-apply-${job.id}`}
                        >
                            Apply now
                        </Link>
                    )
                ) : (
                    <p
                        className="application-row-status"
                        data-testid={`status-application-${job.id}`}
                    >
                        <Check size={14} aria-hidden="true" />
                        {stageLabel(job.applicationStage)} · {job.agency}
                    </p>
                )}
            </div>
        </div>
    );
}
