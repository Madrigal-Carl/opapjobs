import { Head } from '@inertiajs/react';
import {
    ArchiveRestore,
    Bookmark,
    Check,
    Clock3,
    MapPin,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApplicantScope } from '@/components/applicant/applicant-scope';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useApplications } from '@/contexts/applications-context';
import { closingUrgencyLabel, getEffectiveStatus } from '@/data/job-attributes';
import { getJobList } from '@/data/job-store';
import {
    index as jobsIndex,
    show as jobShow,
    apply as jobApply,
} from '@/routes/jobs';
import type { ApplicationTab } from '@/types/application-draft';
import type { Job } from '@/types/job';

/**
 * The three states an application can be in from the applicant's side.
 *
 * "Saved" and "archived" are both a decision not to apply right now; the
 * difference is intent. Archived is the drawer you put something in and
 * forget, so it is kept out of the way until you ask for it.
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
        empty: 'No roles bookmarked yet. Use the bookmark on any listing to keep it here.',
    },
    {
        id: 'archived',
        label: 'Archived',
        empty: 'Nothing archived. Archiving removes a saved role from your main list without deleting it.',
    },
];

/**
 * My Jobs.
 *
 * The three tabs are three views of one local list rather than three
 * pages, so moving a role between them is instant and the counts always
 * agree with what is on screen.
 */
export default function MyJobs() {
    return (
        <ApplicantScope>
            <MyJobsBody />
        </ApplicantScope>
    );
}

function MyJobsBody() {
    const { applied, saved, archived, toggleSaved, setArchived } =
        useApplications();

    const [tab, setTab] = useState<ApplicationTab>('applied');

    const all = useMemo(() => getJobList(), []);

    const rows: Record<ApplicationTab, Job[]> = useMemo(() => {
        const byId = (ids: string[]) =>
            ids
                .map((id) => all.find((job) => job.id === id))
                .filter((job): job is Job => Boolean(job));

        return {
            applied: byId(applied),
            saved: byId(saved),
            archived: byId(archived),
        };
    }, [all, applied, archived, saved]);

    const counts: Record<ApplicationTab, number> = {
        applied: rows.applied.length,
        saved: rows.saved.length,
        archived: rows.archived.length,
    };

    /**
     * Archiving is the one action here with a destructive flavour, so it
     * says what happened and offers the way back rather than asking first.
     */
    const archive = (job: Job) => {
        setArchived(job.id, true);
        toast('Moved to archived', {
            description: job.title,
            action: {
                label: 'Undo',
                onClick: () => setArchived(job.id, false),
            },
        });
    };

    const removeSaved = (job: Job) => {
        toggleSaved(job.id);
        toast('Removed from saved', {
            description: job.title,
            action: {
                label: 'Undo',
                onClick: () => toggleSaved(job.id),
            },
        });
    };

    const restore = (job: Job) => {
        setArchived(job.id, false);
        toast('Moved back to saved', { description: job.title });
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
                        <h1>
                            Everything you have
                            <br />
                            <em>set in motion.</em>
                        </h1>
                    </div>
                    <p>
                        Applications you have sent, roles you bookmarked, and
                        the ones you parked. Nothing here is shared with an
                        agency until you press submit.
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
                            <a href={jobsIndex.url()}>Browse jobs</a>
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
                                <a href={jobsIndex.url()}>
                                    Browse verified jobs
                                </a>
                            </Button>
                        </div>
                    ) : (
                        <div className="applications-panel">
                            {current.map((job) => (
                                <ApplicationRow
                                    key={job.id}
                                    job={job}
                                    tab={tab}
                                    onArchive={() => archive(job)}
                                    onRestore={() => restore(job)}
                                    onRemove={() => removeSaved(job)}
                                />
                            ))}
                        </div>
                    )}

                    <p className="applications-end">
                        <Clock3 size={13} aria-hidden="true" />
                        Applications you send are recorded for the agency. Saved
                        and archived roles stay on this device only — sign in on
                        another device to see your saved jobs there too.
                    </p>
                </div>
            </section>
        </>
    );
}

function ApplicationRow({
    job,
    tab,
    onArchive,
    onRestore,
    onRemove,
}: {
    job: Job;
    tab: ApplicationTab;
    onArchive: () => void;
    onRestore: () => void;
    onRemove: () => void;
}) {
    const isClosed = getEffectiveStatus(job) === 'closed';
    const urgency = closingUrgencyLabel(job.closingDate);

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
                    {job.urgent && (
                        <span className="jobs-card-label urgent">Urgent</span>
                    )}
                    {isClosed && (
                        <span className="jobs-card-label">Closed</span>
                    )}
                </div>

                <h3>
                    <a
                        href={jobShow.url(job.id)}
                        data-testid={`link-application-${job.id}`}
                    >
                        {job.title}
                    </a>
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
                <a
                    className="job-view-link"
                    href={jobShow.url(job.id)}
                    data-testid={`link-application-view-${job.id}`}
                >
                    View listing
                </a>

                {tab === 'applied' ? (
                    <p className="application-row-status">
                        <Check size={14} aria-hidden="true" />
                        Sent to {job.agency}
                    </p>
                ) : tab === 'saved' ? (
                    <>
                        <a
                            className="job-view-link"
                            href={jobApply.url(job.id)}
                            data-testid={`link-application-apply-${job.id}`}
                        >
                            Apply now
                        </a>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onArchive}
                            data-testid={`button-archive-${job.id}`}
                        >
                            <ArchiveRestore size={14} aria-hidden="true" />{' '}
                            Archive
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={onRestore}
                            data-testid={`button-restore-${job.id}`}
                        >
                            <ArchiveRestore size={14} aria-hidden="true" /> Move
                            back to saved
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onRemove}
                            data-testid={`button-remove-${job.id}`}
                        >
                            <Trash2 size={14} aria-hidden="true" /> Delete
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
