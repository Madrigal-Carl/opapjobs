import { Head } from '@inertiajs/react';
import {
    Archive,
    ArrowRight,
    Bookmark,
    BriefcaseBusiness,
    type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    JobListingCard,
    type JobListingStatus,
} from '@/components/site/job-listing-card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useApplications } from '@/contexts/applications-context';
import { getOpenJobs } from '@/data/job-browse';
import { getJobList } from '@/data/job-store';
import type { ApplicationTab } from '@/types/application-draft';

/** Cards revealed each time the list grows. */
const PAGE_SIZE = 6;

type TabMeta = {
    id: ApplicationTab;
    label: string;
    noun: string;
    icon: LucideIcon;
    emptyHeading: string;
    emptyBody: string;
    status: JobListingStatus;
};

const TABS: TabMeta[] = [
    {
        id: 'applied',
        label: 'Applied',
        noun: 'applied',
        icon: BriefcaseBusiness,
        emptyHeading: 'No applications yet',
        emptyBody:
            'Every verified opening you apply to shows up here with its agency, pay range, and next step.',
        status: { label: 'Applied', tone: 'applied' },
    },
    {
        id: 'saved',
        label: 'Saved',
        noun: 'saved',
        icon: Bookmark,
        emptyHeading: 'Nothing saved yet',
        emptyBody:
            'Bookmark any listing while you compare agencies, pay, and destinations, and it will wait for you here.',
        status: { label: 'Saved', tone: 'saved' },
    },
    {
        id: 'archived',
        label: 'Archived',
        noun: 'archived',
        icon: Archive,
        emptyHeading: 'Your archive is empty',
        emptyBody:
            'Roles you set aside are kept here, so your applied and saved lists stay focused on what is live.',
        status: { label: 'Archived', tone: 'archived' },
    },
];

function isTab(value: string | null): value is ApplicationTab {
    return TABS.some((tab) => tab.id === value);
}

function readInitialTab(): ApplicationTab {
    if (typeof window === 'undefined') {
        return 'applied';
    }

    const tab = new URLSearchParams(window.location.search).get('tab');

    return isTab(tab) ? tab : 'applied';
}

export default function Applications() {
    const {
        applied,
        saved,
        archived,
        isApplied,
        isSaved,
        toggleSaved,
        setArchived,
    } = useApplications();

    const [activeTab, setActiveTab] = useState<ApplicationTab>(readInitialTab);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const tabRefs = useRef<
        Partial<Record<ApplicationTab, HTMLButtonElement | null>>
    >({});

    /**
     * Applied and saved listings are looked up in the live job list so a
     * posting still shows its current title and pay range; anything that has
     * since been removed is simply left out.
     */
    const jobsById = useMemo(() => {
        const map = new Map(getJobList().map((job) => [job.id, job]));

        for (const job of getOpenJobs()) {
            map.set(job.id, job);
        }

        return map;
    }, []);

    const activityByTab = useMemo(
        () =>
            ({ applied, saved, archived }) as Record<ApplicationTab, string[]>,
        [applied, archived, saved],
    );

    const tabJobs = useMemo(
        () =>
            activityByTab[activeTab]
                .map((jobId) => jobsById.get(jobId))
                .filter((job): job is NonNullable<typeof job> => Boolean(job)),
        [activityByTab, activeTab, jobsById],
    );

    const activeTabMeta = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];
    const visibleJobs = tabJobs.slice(0, visibleCount);
    const hasMore = visibleCount < tabJobs.length;

    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [activeTab]);

    useEffect(() => {
        const node = loadMoreRef.current;

        if (!node || !hasMore) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisibleCount((current) =>
                        Math.min(current + PAGE_SIZE, tabJobs.length),
                    );
                }
            },
            { rootMargin: '240px' },
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, [hasMore, tabJobs.length]);

    const selectTab = useCallback((tab: ApplicationTab) => {
        setActiveTab(tab);

        const url = new URL(window.location.href);

        if (tab === 'applied') {
            url.searchParams.delete('tab');
        } else {
            url.searchParams.set('tab', tab);
        }

        window.history.replaceState(null, '', `${url.pathname}${url.search}`);
    }, []);

    /** Arrow keys move between tabs, matching the tablist pattern. */
    const onTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const order = TABS.map((tab) => tab.id);
        const index = order.indexOf(activeTab);
        let next: ApplicationTab | undefined;

        if (event.key === 'ArrowRight') {
            next = order[(index + 1) % order.length];
        } else if (event.key === 'ArrowLeft') {
            next = order[(index - 1 + order.length) % order.length];
        } else if (event.key === 'Home') {
            next = order[0];
        } else if (event.key === 'End') {
            next = order[order.length - 1];
        }

        if (!next) {
            return;
        }

        event.preventDefault();
        selectTab(next);
        tabRefs.current[next]?.focus();
    };

    const handleArchive = (
        jobId: string,
        title: string,
        archivedNow: boolean,
    ) => {
        setArchived(jobId, archivedNow);
        toast(
            archivedNow
                ? `Archived ${title}. You can restore it any time.`
                : `${title} is back in your list.`,
        );
    };

    return (
        <>
            <Head title="My Jobs — Applied, Saved and Archived | OPAP Job Abroad">
                <meta
                    name="description"
                    content="Track the verified overseas jobs you have applied to, saved for later, or archived, with the agency, pay range, and next step for each role."
                />
            </Head>

            <section
                className="applications-hero"
                aria-labelledby="applications-title"
            >
                <div className="shell applications-hero-inner">
                    <h1 id="applications-title">My jobs, one clear view.</h1>
                    <p>
                        Applied, saved, and archived roles — with the accredited
                        agency, pay range, and next step for every listing.
                    </p>

                    <div
                        className="applications-tabs"
                        role="tablist"
                        aria-label="Application status"
                        onKeyDown={onTabKeyDown}
                    >
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                ref={(node) => {
                                    tabRefs.current[tab.id] = node;
                                }}
                                className="applications-tab"
                                id={`applications-tab-${tab.id}`}
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                aria-controls={`applications-panel-${tab.id}`}
                                tabIndex={activeTab === tab.id ? 0 : -1}
                                onClick={() => selectTab(tab.id)}
                                data-testid={`tab-${tab.id}`}
                            >
                                {tab.label}
                                <span className="applications-tab-count">
                                    {activityByTab[tab.id].length}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="applications-section">
                <div className="shell">
                    <div
                        className="applications-panel"
                        id={`applications-panel-${activeTab}`}
                        role="tabpanel"
                        aria-labelledby={`applications-tab-${activeTab}`}
                        tabIndex={0}
                    >
                        {tabJobs.length > 0 ? (
                            <>
                                <div className="applications-toolbar">
                                    <span className="results-count">
                                        {tabJobs.length} {activeTabMeta.noun}{' '}
                                        {tabJobs.length === 1 ? 'job' : 'jobs'}
                                    </span>
                                    <a
                                        className="applications-toolbar-link"
                                        href="/jobs"
                                        data-testid="link-applications-find-more"
                                    >
                                        Find more jobs{' '}
                                        <ArrowRight
                                            size={15}
                                            aria-hidden="true"
                                        />
                                    </a>
                                </div>

                                <div className="jobs-list">
                                    {visibleJobs.map((job) => (
                                        <JobListingCard
                                            key={job.id}
                                            job={job}
                                            isSaved={isSaved(job.id)}
                                            onToggleSaved={() => {
                                                toggleSaved(job.id);
                                                toast(
                                                    isSaved(job.id)
                                                        ? `Removed ${job.title} from saved jobs.`
                                                        : `Saved ${job.title}.`,
                                                );
                                            }}
                                            status={
                                                isApplied(job.id)
                                                    ? TABS[0].status
                                                    : activeTabMeta.status
                                            }
                                            onToggleArchive={() =>
                                                handleArchive(
                                                    job.id,
                                                    job.title,
                                                    activeTab !== 'archived',
                                                )
                                            }
                                            testId={`card-application-${job.id}`}
                                        />
                                    ))}
                                </div>

                                {hasMore ? (
                                    <>
                                        <div
                                            className="applications-loader"
                                            ref={loadMoreRef}
                                            role="status"
                                            aria-live="polite"
                                            data-testid="status-applications-loading"
                                        >
                                            <span
                                                className="applications-loader-dot"
                                                aria-hidden="true"
                                            />
                                            <span
                                                className="applications-loader-dot"
                                                aria-hidden="true"
                                            />
                                            <span
                                                className="applications-loader-dot"
                                                aria-hidden="true"
                                            />
                                            Loading more {activeTabMeta.noun}{' '}
                                            jobs
                                        </div>
                                        <div className="mt-4 text-center">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() =>
                                                    setVisibleCount((current) =>
                                                        Math.min(
                                                            current + PAGE_SIZE,
                                                            tabJobs.length,
                                                        ),
                                                    )
                                                }
                                                data-testid="button-applications-load-more"
                                            >
                                                Load{' '}
                                                {Math.min(
                                                    PAGE_SIZE,
                                                    tabJobs.length -
                                                        visibleCount,
                                                )}{' '}
                                                more
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <p className="applications-end">
                                        That is every {activeTabMeta.noun} job
                                        on your list.
                                    </p>
                                )}
                            </>
                        ) : (
                            <div className="applications-empty">
                                <activeTabMeta.icon
                                    size={30}
                                    aria-hidden="true"
                                />
                                <h2>{activeTabMeta.emptyHeading}</h2>
                                <p>{activeTabMeta.emptyBody}</p>
                                <a
                                    href="/jobs"
                                    data-testid="link-applications-browse-jobs"
                                >
                                    Browse verified jobs{' '}
                                    <ArrowRight size={16} aria-hidden="true" />
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </>
    );
}
