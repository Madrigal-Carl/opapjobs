import { Head, router, usePage } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    Building2,
    Clock3,
    MapPin,
    Search,
    SearchX,
    Ship,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { JobDetailPanel } from '@/components/applicant/job-detail-panel';
import { ApplicantScope } from '@/components/applicant/applicant-scope';
import {
    JobDetailSkeleton,
    JobListSkeleton,
} from '@/components/applicant/job-list-skeleton';
import { JobCard } from '@/components/site/job-card';
import { Button } from '@/components/ui/button';
import { useApplications } from '@/contexts/applications-context';
import { countryOptions } from '@/data/countries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
    JOB_FILTER_LABELS,
    JOB_FILTERS,
    toggleJobFilter,
} from '@/lib/public-catalog';
import { cn } from '@/lib/utils';
import { login } from '@/routes';
import {
    apply as jobApply,
    index as jobsIndex,
    show as jobShow,
} from '@/routes/jobs';
import type { JobFilterId, PublicJobPostPreview } from '@/types/public-catalog';

const FILTER_ICONS: Record<JobFilterId, LucideIcon> = {
    landbased: Building2,
    seabased: Ship,
    urgent: Zap,
    recent: Clock3,
};

/**
 * How far past the bottom of the viewport the end of the list may sit
 * before the next batch is requested. Roughly one and a half rows of cards,
 * so the next rows are already there by the time the reader reaches them.
 */
const LOAD_AHEAD_PX = 320;

/** The split view only exists above this width; below it cards navigate. */
const SPLIT_VIEW_QUERY = '(min-width: 768px)';

/** How long typing settles before the server is asked for new results. */
const SEARCH_DEBOUNCE_MS = 300;

/** Placeholder cards appended below the list while the next batch loads. */
const LOAD_MORE_SKELETON_ROWS = 2;

type JobsIndexProps = {
    /** A merge prop: "load more" appends to it, a new search resets it. */
    jobPosts: PublicJobPostPreview[];
    jobPostsMeta: {
        page: number;
        hasMore: boolean;
        nextPage: number | null;
        total: number;
    };
    filters: { q: string; country: string; filters: JobFilterId[] };
};

type SearchState = JobsIndexProps['filters'];

/** The query string for a search. `page` is never written: a reload starts at page 1. */
function searchParams(search: SearchState): Record<string, string | string[]> {
    const params: Record<string, string | string[]> = {};

    if (search.q) {
        params.q = search.q;
    }

    if (search.country) {
        params.country = search.country;
    }

    if (search.filters.length > 0) {
        params.filters = search.filters;
    }

    return params;
}

/** The job post shown in the detail column, kept in the URL with `replaceState`. */
function readSelectedJob(): string {
    if (typeof window === 'undefined') {
        return '';
    }

    return new URLSearchParams(window.location.search).get('job') ?? '';
}

function writeSelectedJob(jobId: string): void {
    const url = new URL(window.location.href);

    if (jobId) {
        url.searchParams.set('job', jobId);
    } else {
        url.searchParams.delete('job');
    }

    window.history.replaceState(window.history.state, '', url.toString());
}

export default function JobsIndex(props: JobsIndexProps) {
    return (
        <ApplicantScope>
            <JobsBrowser {...props} />
        </ApplicantScope>
    );
}

function JobsBrowser({
    jobPosts: results,
    jobPostsMeta: meta,
    filters,
}: JobsIndexProps) {
    const { props } = usePage();
    const user = props.auth.user;
    const { isApplied, isSaved, toggleSaved } = useApplications();

    // The inputs stay local so typing never lags behind the cursor; the
    // debounced copy is what is sent to the server.
    const [keyword, setKeyword] = useState(filters.q);
    const [country, setCountry] = useState(filters.country);
    const [countryOpen, setCountryOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(readSelectedJob);
    const [isSplitView, setIsSplitView] = useState(false);
    /** True while a new search is in flight; the skeleton covers the list. */
    const [isResolving, setIsResolving] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    /**
     * The toggles just clicked, shown as active straight away while the
     * server catches up; `null` once the page props agree again.
     */
    const [pendingFilters, setPendingFilters] = useState<JobFilterId[] | null>(
        null,
    );
    const latestVisit = useRef(0);
    /**
     * Set synchronously, unlike `isLoadingMore`, so two scroll events in the
     * same frame cannot both request the next batch.
     */
    const loadingMoreRef = useRef(false);

    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    const searchInput = useMemo(
        () => ({ q: keyword, country }),
        [keyword, country],
    );
    const search = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

    useEffect(() => {
        const media = window.matchMedia(SPLIT_VIEW_QUERY);
        const sync = () => setIsSplitView(media.matches);

        sync();
        media.addEventListener('change', sync);

        return () => media.removeEventListener('change', sync);
    }, []);

    /** A different search always starts again from the first page. */
    const update = useCallback((next: Partial<SearchState>) => {
        const merged = { ...filtersRef.current, ...next };
        const visit = ++latestVisit.current;

        if (next.filters) {
            setPendingFilters(next.filters);
        }

        // A "load more" still in flight belongs to the previous search; left
        // running it would land after this visit and write its stale page
        // (and filters) back over the new results.
        router.cancelAll({ sync: false, prefetch: false });
        loadingMoreRef.current = false;
        setIsLoadingMore(false);

        router.get(jobsIndex.url(), searchParams(merged), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            reset: ['jobPosts'],
            onStart: () => setIsResolving(true),
            // A visit cancelled by a newer one must not clear the newer state.
            onFinish: () => {
                if (visit === latestVisit.current) {
                    setIsResolving(false);
                    setPendingFilters(null);
                }
            },
        });
    }, []);

    // Reflect typing into the search once it settles.
    useEffect(() => {
        const q = search.q.trim();
        const place = search.country.trim();
        const current = filtersRef.current;

        if (current.q !== q || current.country !== place) {
            update({ q, country: place });
        }
    }, [search, update]);

    useEffect(() => {
        writeSelectedJob(selectedId);
    }, [selectedId]);

    const matchingCountries = useMemo(() => {
        const query = country.trim().toLowerCase();

        if (!query) {
            return countryOptions;
        }

        return countryOptions.filter((option) =>
            option.toLowerCase().includes(query),
        );
    }, [country]);

    // Keep the detail column pointing at something that is still on screen.
    const selectedJob = useMemo(
        () => results.find((job) => job.id === selectedId) ?? results[0],
        [results, selectedId],
    );

    /** Appends the next server page; the URL keeps describing page one. */
    const loadMore = useCallback(() => {
        if (!meta.nextPage || loadingMoreRef.current) {
            return;
        }

        loadingMoreRef.current = true;
        router.reload({
            data: { ...searchParams(filtersRef.current), page: meta.nextPage },
            only: ['jobPosts', 'jobPostsMeta'],
            preserveUrl: true,
            onStart: () => setIsLoadingMore(true),
            onFinish: () => {
                loadingMoreRef.current = false;
                setIsLoadingMore(false);
            },
        });
    }, [meta.nextPage]);

    /**
     * Loads the next batch as the end of the list approaches the viewport.
     *
     * Driven by a scroll listener rather than an IntersectionObserver,
     * because the observer only reports when the browser's rendering
     * lifecycle runs — so it stays silent in a background tab, in a
     * prerender, and in any test harness that never paints. A page the
     * reader never scrolls still fills out, because `check` runs once on
     * every attach.
     */
    useEffect(() => {
        if (isResolving || !meta.hasMore || isLoadingMore) {
            return;
        }

        const check = () => {
            const node = sentinelRef.current;

            if (
                node &&
                node.getBoundingClientRect().top <
                    window.innerHeight + LOAD_AHEAD_PX
            ) {
                loadMore();
            }
        };

        check();

        window.addEventListener('scroll', check, { passive: true });
        window.addEventListener('resize', check);

        return () => {
            window.removeEventListener('scroll', check);
            window.removeEventListener('resize', check);
        };
    }, [isLoadingMore, isResolving, loadMore, meta.hasMore, results.length]);

    /** Enter skips the debounce rather than waiting for it to settle. */
    const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        update({ q: keyword.trim(), country: country.trim() });
    };

    const activeFilters = pendingFilters ?? filters.filters;

    /** On, off, and one pathway at a time — see `toggleJobFilter`. */
    const toggleFilter = (filter: JobFilterId) => {
        update({ filters: toggleJobFilter(activeFilters, filter) });
    };

    const clearFilters = () => {
        setKeyword('');
        setCountry('');
        setSelectedId('');
        update({ q: '', country: '', filters: [] });
    };

    const hasAnyFilter =
        filters.q !== '' || filters.country !== '' || activeFilters.length > 0;

    const selectJob = (jobId: string) => {
        // Below the split-view breakpoint a card opens the job post itself.
        if (!isSplitView) {
            router.visit(jobShow.url(jobId));

            return;
        }

        setSelectedId(jobId);
    };

    /** Guests are sent to sign in and returned to the job post afterwards. */
    const applyHrefFor = (jobId: string) =>
        user ? jobApply.url(jobId) : login.url();

    return (
        <>
            <Head title="Jobs you can verify before you apply | OPAP Job Abroad">
                <meta
                    name="description"
                    content="Browse landbased and seabased openings from DMW-accredited agencies, and see the full job post before you apply."
                />
            </Head>

            <section className="jobs-hero" aria-labelledby="jobs-title">
                <div className="shell jobs-hero-inner">
                    <h1 id="jobs-title">
                        Jobs you can verify before you apply.
                    </h1>
                    <p>
                        Browse landbased and seabased openings from
                        DMW-accredited agencies, and see the full job post
                        before you apply.
                    </p>
                </div>
            </section>

            <div className="jobs-browse">
                <section
                    className="jobs-search-section"
                    aria-labelledby="jobs-search-title"
                >
                    <div className="shell">
                        <div className="jobs-search-card">
                            <div className="agencies-search-card">
                                <div className="jobs-search-heading">
                                    <div>
                                        <div
                                            className="eyebrow"
                                            id="jobs-search-title"
                                        >
                                            <span className="eyebrow-rule" />{' '}
                                            SEARCH OPENINGS
                                        </div>
                                        <h2>Find your next clear step.</h2>
                                    </div>
                                    <p>
                                        Search by skill, location, or pathway,
                                        then compare the full details before you
                                        apply.
                                    </p>
                                </div>

                                <form
                                    className="agency-search-form"
                                    role="search"
                                    onSubmit={submitSearch}
                                >
                                    <label className="agency-search-field">
                                        <div>
                                            <Search
                                                size={18}
                                                aria-hidden="true"
                                            />
                                            <input
                                                type="search"
                                                value={keyword}
                                                maxLength={100}
                                                onChange={(event) =>
                                                    setKeyword(
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="e.g. Nurse, electrician"
                                                aria-label="Job title or skill"
                                                data-testid="input-jobs-keyword"
                                            />
                                        </div>
                                    </label>

                                    <div
                                        className={cn(
                                            'agency-search-field agency-country-field',
                                            countryOpen && 'is-open',
                                        )}
                                    >
                                        <div>
                                            <MapPin
                                                size={18}
                                                aria-hidden="true"
                                            />
                                            <input
                                                type="text"
                                                role="combobox"
                                                aria-expanded={countryOpen}
                                                aria-controls="jobs-country-options"
                                                aria-autocomplete="list"
                                                aria-activedescendant={
                                                    countryOpen
                                                        ? 'jobs-country-highlight'
                                                        : undefined
                                                }
                                                autoComplete="off"
                                                value={country}
                                                maxLength={100}
                                                onChange={(event) => {
                                                    setCountry(
                                                        event.target.value,
                                                    );
                                                    setCountryOpen(true);
                                                }}
                                                onFocus={() =>
                                                    setCountryOpen(true)
                                                }
                                                onKeyDown={(event) => {
                                                    if (
                                                        event.key === 'Escape'
                                                    ) {
                                                        setCountryOpen(false);
                                                    }
                                                }}
                                                onBlur={() =>
                                                    window.setTimeout(
                                                        () =>
                                                            setCountryOpen(
                                                                false,
                                                            ),
                                                        120,
                                                    )
                                                }
                                                placeholder="e.g. Gulf, international waters"
                                                aria-label="Country or region"
                                                data-testid="input-jobs-country"
                                            />
                                        </div>
                                        {countryOpen && (
                                            <div
                                                className="agency-country-options"
                                                id="jobs-country-options"
                                                role="listbox"
                                                aria-label="Country suggestions"
                                                data-testid="listbox-jobs-country-options"
                                            >
                                                {matchingCountries.length >
                                                0 ? (
                                                    matchingCountries.map(
                                                        (option, index) => (
                                                            <button
                                                                key={option}
                                                                id={
                                                                    index === 0
                                                                        ? 'jobs-country-highlight'
                                                                        : undefined
                                                                }
                                                                type="button"
                                                                role="option"
                                                                aria-selected={
                                                                    country ===
                                                                    option
                                                                }
                                                                onMouseDown={(
                                                                    event,
                                                                ) =>
                                                                    event.preventDefault()
                                                                }
                                                                onClick={() => {
                                                                    setCountry(
                                                                        option,
                                                                    );
                                                                    setCountryOpen(
                                                                        false,
                                                                    );
                                                                }}
                                                                data-testid={`option-jobs-country-${option}`}
                                                            >
                                                                {option}
                                                            </button>
                                                        ),
                                                    )
                                                ) : (
                                                    <span className="agency-country-empty">
                                                        No matching countries
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        type="submit"
                                        className="agency-search-button"
                                        data-testid="button-jobs-search"
                                    >
                                        Search jobs
                                        <Search aria-hidden="true" />
                                    </Button>
                                </form>

                                <div
                                    className="jobs-filter-row"
                                    role="group"
                                    aria-label="Filter jobs"
                                >
                                    {JOB_FILTERS.map((filter) => {
                                        const Icon = FILTER_ICONS[filter];
                                        const isActive =
                                            activeFilters.includes(filter);

                                        return (
                                            <button
                                                key={filter}
                                                type="button"
                                                className={cn(
                                                    'jobs-filter-pill',
                                                    isActive && 'active',
                                                )}
                                                aria-pressed={isActive}
                                                onClick={() =>
                                                    toggleFilter(filter)
                                                }
                                                data-testid={`filter-${filter}`}
                                            >
                                                <Icon aria-hidden="true" />
                                                {JOB_FILTER_LABELS[filter]}
                                            </button>
                                        );
                                    })}
                                </div>

                                <p
                                    className="jobs-search-notice"
                                    role="status"
                                    aria-live="polite"
                                    data-testid="status-jobs-results"
                                >
                                    <span className="results-count">
                                        {meta.total} verified{' '}
                                        {meta.total === 1 ? 'role' : 'roles'}{' '}
                                        available
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    className="jobs-results-section"
                    aria-label="Job results"
                >
                    <div className="shell">
                        <div className="jobs-split-view">
                            <div className="jobs-list-panel">
                                {isResolving ? (
                                    <JobListSkeleton />
                                ) : results.length === 0 ? (
                                    <div
                                        className="jobs-empty-state"
                                        data-testid="jobs-empty-state"
                                    >
                                        <SearchX size={28} aria-hidden="true" />
                                        <h3>No jobs match those filters</h3>
                                        <p>
                                            Try a different keyword, widen the
                                            pathway, or clear the filters to see
                                            every verified opening.
                                        </p>
                                        {hasAnyFilter && (
                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                data-testid="button-jobs-clear-filters"
                                            >
                                                Clear filters
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {results.map((job) => (
                                            <JobCard
                                                key={job.id}
                                                job={job}
                                                isSelected={
                                                    selectedJob?.id === job.id
                                                }
                                                isSaved={isSaved(job.id)}
                                                onSelect={() =>
                                                    selectJob(job.id)
                                                }
                                                onToggleSaved={() =>
                                                    toggleSaved(job.id)
                                                }
                                                testId={`card-job-${job.id}`}
                                            />
                                        ))}
                                        <div
                                            className="jobs-load-sentinel"
                                            ref={sentinelRef}
                                            aria-hidden="true"
                                        />
                                        {isLoadingMore && (
                                            <JobListSkeleton
                                                rows={LOAD_MORE_SKELETON_ROWS}
                                                testId="jobs-load-more-skeleton"
                                            />
                                        )}
                                        {meta.hasMore && !isLoadingMore && (
                                            <p
                                                className="jobs-load-more"
                                                role="status"
                                                aria-live="polite"
                                                data-testid="status-jobs-loading-more"
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
                                                Showing {results.length} of{' '}
                                                {meta.total} — scroll for more
                                            </p>
                                        )}
                                        {!meta.hasMore && meta.page > 1 && (
                                            <p
                                                className="jobs-load-end"
                                                data-testid="status-jobs-all-loaded"
                                            >
                                                That is every verified opening
                                                matching your search.
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="jobs-detail-column">
                                {isResolving ? (
                                    <JobDetailSkeleton />
                                ) : selectedJob ? (
                                    <JobDetailPanel
                                        job={selectedJob}
                                        isSaved={isSaved(selectedJob.id)}
                                        isApplied={isApplied(selectedJob.id)}
                                        applyHref={applyHrefFor(selectedJob.id)}
                                        viewAllHref={jobShow.url(
                                            selectedJob.id,
                                        )}
                                        onToggleSaved={() =>
                                            toggleSaved(selectedJob.id)
                                        }
                                    />
                                ) : (
                                    <div className="jobs-empty-detail">
                                        <BriefcaseBusiness
                                            size={26}
                                            aria-hidden="true"
                                        />
                                        <p className="mt-3">
                                            Select a job post to read the full
                                            detail.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
