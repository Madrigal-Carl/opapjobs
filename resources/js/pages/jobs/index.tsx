import { Head, router, usePage } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    Building2,
    Clock3,
    MapPin,
    Search,
    SearchX,
    Ship,
    Star,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { JobDetailPanel } from '@/components/applicant/job-detail-panel';
import { JobListSkeleton } from '@/components/applicant/job-list-skeleton';
import { JobCard } from '@/components/site/job-card';
import { Button } from '@/components/ui/button';
import { useApplications } from '@/contexts/applications-context';
import { countryOptions } from '@/data/countries';
import {
    browseJobs,
    getJobFilterCounts,
    JOB_FILTER_LABELS,
    type JobFilterId,
} from '@/data/job-browse';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';
import { apply as jobApply, show as jobShow } from '@/routes/jobs';
import { login } from '@/routes';

const FILTER_ICONS: Record<JobFilterId, LucideIcon> = {
    landbased: Building2,
    seabased: Ship,
    featured: Star,
    urgent: Zap,
    recent: Clock3,
};

const FILTERS = Object.keys(JOB_FILTER_LABELS) as JobFilterId[];

/** How many listings render before the "load more" sentinel takes over. */
const BATCH_SIZE = 5;

/** The split view only exists above this width; below it cards navigate. */
const SPLIT_VIEW_QUERY = '(min-width: 768px)';

/** How long typing settles before the list and the URL are rewritten. */
const SEARCH_DEBOUNCE_MS = 200;

/**
 * Everything that lives in the URL, so a search can be shared, reloaded, or
 * reached with the back button and land on exactly the same view.
 */
type BrowseState = {
    q: string;
    country: string;
    active: JobFilterId[];
    /** The listing shown in the sticky detail column. */
    job: string;
};

const EMPTY_STATE: BrowseState = { q: '', country: '', active: [], job: '' };

function readState(): BrowseState {
    if (typeof window === 'undefined') {
        return EMPTY_STATE;
    }

    const params = new URLSearchParams(window.location.search);
    const filter = params.get('filter');

    return {
        q: (params.get('q') ?? '').slice(0, 100),
        country: (params.get('country') ?? '').slice(0, 100),
        active:
            filter && filter in JOB_FILTER_LABELS
                ? [filter as JobFilterId]
                : [],
        job: params.get('job') ?? '',
    };
}

/**
 * Mirrors the state into the URL with `replaceState`: a search belongs to
 * this page rather than to a history entry, so holding the back button should
 * leave the browser rather than walk back through every keystroke.
 */
function writeState(state: BrowseState): void {
    const params = new URLSearchParams();

    if (state.q) {
        params.set('q', state.q);
    }

    if (state.country) {
        params.set('country', state.country);
    }

    if (state.active.length === 1) {
        params.set('filter', state.active[0]);
    }

    if (state.job) {
        params.set('job', state.job);
    }

    const query = params.toString();

    window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}`,
    );
}

export default function JobsIndex() {
    const { props } = usePage();
    const user = props.auth.user;
    const { isApplied, isSaved, toggleSaved } = useApplications();

    const [state, setState] = useState<BrowseState>(readState);
    // The inputs stay local and unsynchronised so typing never lags behind
    // the cursor; `search` below is the debounced copy the list reads from.
    const [keyword, setKeyword] = useState(state.q);
    const [country, setCountry] = useState(state.country);
    const [countryOpen, setCountryOpen] = useState(false);
    const [loadedCount, setLoadedCount] = useState(BATCH_SIZE);
    const [isSplitView, setIsSplitView] = useState(false);
    /**
     * Filters are read from the URL on mount, so the first frame has not
     * settled on a result set yet. The skeleton covers that single tick.
     */
    const [isResolving, setIsResolving] = useState(true);

    const sentinelRef = useRef<HTMLDivElement | null>(null);

    // Memoised so the debounce is not restarted by unrelated re-renders.
    const searchInput = useMemo(
        () => ({ q: keyword, country }),
        [keyword, country],
    );
    const search = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

    useEffect(() => {
        setIsResolving(false);
    }, []);

    useEffect(() => {
        const media = window.matchMedia(SPLIT_VIEW_QUERY);
        const sync = () => setIsSplitView(media.matches);

        sync();
        media.addEventListener('change', sync);

        return () => media.removeEventListener('change', sync);
    }, []);

    useEffect(() => {
        const onPopState = () => {
            const next = readState();

            setState(next);
            setKeyword(next.q);
            setCountry(next.country);
        };

        window.addEventListener('popstate', onPopState);

        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    /**
     * Reflect typing into the shared state once it settles. Trimmed here as
     * well as in `submitSearch`, so pressing Enter does not briefly put an
     * untrimmed value back into the URL when the debounce catches up.
     */
    useEffect(() => {
        const q = search.q.trim();
        const place = search.country.trim();

        setState((current) =>
            current.q === q && current.country === place
                ? current
                : { ...current, q, country: place },
        );
    }, [search]);

    // Keep the URL in step with whatever the shared state currently is.
    useEffect(() => {
        writeState(state);
    }, [state]);

    /**
     * Applies a change to the shared state. Pagination is reset by its own
     * effect below, so selecting a different card never truncates the list.
     */
    const update = useCallback((next: Partial<BrowseState>) => {
        setState((current) => ({ ...current, ...next }));
    }, []);

    const results = useMemo(
        () =>
            browseJobs({
                q: search.q,
                country: search.country,
                filters: state.active,
            }),
        [search, state.active],
    );

    /**
     * Counts follow the search but ignore the toggles themselves, so a
     * number is never zero for a filter the applicant is looking at.
     */
    const filterCounts = useMemo(
        () => getJobFilterCounts({ q: search.q, country: search.country }),
        [search],
    );

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
    const selectedJob = useMemo(() => {
        const chosen = results.find((job) => job.id === state.job);

        return chosen ?? results[0];
    }, [results, state.job]);

    const loadedJobs = useMemo(
        () => results.slice(0, loadedCount),
        [loadedCount, results],
    );

    const hasMore = loadedCount < results.length;

    // A different result set starts again from the first page.
    useEffect(() => {
        setLoadedCount(BATCH_SIZE);
    }, [search, state.active]);

    useEffect(() => {
        const node = sentinelRef.current;

        if (!node || !hasMore) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setLoadedCount((current) =>
                        Math.min(current + BATCH_SIZE, results.length),
                    );
                }
            },
            { rootMargin: '240px' },
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, [hasMore, results.length]);

    /** Enter skips the debounce rather than waiting for it to settle. */
    const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        update({ q: keyword.trim(), country: country.trim() });
    };

    const toggleFilter = (filter: JobFilterId) => {
        update({
            active: state.active.includes(filter)
                ? state.active.filter((id) => id !== filter)
                : [...state.active, filter],
        });
    };

    const clearFilters = () => {
        setKeyword('');
        setCountry('');
        update({ q: '', country: '', active: [], job: '' });
    };

    const hasAnyFilter =
        state.q !== '' || state.country !== '' || state.active.length > 0;

    const selectJob = (jobId: string) => {
        // Below the split-view breakpoint a card opens the listing itself.
        if (!isSplitView) {
            router.visit(jobShow.url(jobId));

            return;
        }

        update({ job: jobId });
    };

    /** Guests are sent to sign in and returned to the listing afterwards. */
    const applyHrefFor = (jobId: string) =>
        user ? jobApply.url(jobId) : login.url();

    return (
        <>
            <Head title="Browse Verified Jobs Abroad | OPAP Job Abroad">
                <meta
                    name="description"
                    content="Browse verified landbased and seabased openings from DMW-accredited agencies, and see the full listing before you apply."
                />
            </Head>

            <section className="jobs-hero" aria-labelledby="jobs-title">
                <div className="shell jobs-hero-inner">
                    <h1 id="jobs-title">
                        Every opening,
                        <br />
                        <em>in the open.</em>
                    </h1>
                    <p>
                        Search verified landbased and seabased roles from
                        DMW-accredited agencies. Pick a listing to see the whole
                        detail, then apply without losing your place.
                    </p>
                </div>
            </section>

            <section
                className="jobs-search-section"
                aria-labelledby="jobs-search-title"
            >
                <div className="shell">
                    <div className="agencies-search-card">
                        <div className="jobs-search-heading">
                            <div>
                                <div className="eyebrow" id="jobs-search-title">
                                    <span className="eyebrow-rule" /> SEARCH
                                    VERIFIED OPENINGS
                                </div>
                                <h2>Narrow it down.</h2>
                            </div>
                            <p>
                                Search by role, employer or agency, then filter
                                by pathway and urgency.
                            </p>
                        </div>

                        <form
                            className="agency-search-form"
                            role="search"
                            onSubmit={submitSearch}
                        >
                            <label className="agency-search-field">
                                <div>
                                    <Search size={18} aria-hidden="true" />
                                    <input
                                        type="search"
                                        value={keyword}
                                        onChange={(event) =>
                                            setKeyword(event.target.value)
                                        }
                                        placeholder="Search jobs by title, employer or agency"
                                        aria-label="Search jobs by title, employer or agency"
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
                                    <MapPin size={18} aria-hidden="true" />
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
                                        onChange={(event) => {
                                            setCountry(event.target.value);
                                            setCountryOpen(true);
                                        }}
                                        onFocus={() => setCountryOpen(true)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Escape') {
                                                setCountryOpen(false);
                                            }
                                        }}
                                        onBlur={() =>
                                            window.setTimeout(
                                                () => setCountryOpen(false),
                                                120,
                                            )
                                        }
                                        placeholder="Country or region"
                                        aria-label="Filter by country or region"
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
                                        {matchingCountries.length > 0 ? (
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
                                                            country === option
                                                        }
                                                        onMouseDown={(event) =>
                                                            event.preventDefault()
                                                        }
                                                        onClick={() => {
                                                            setCountry(option);
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
                                <Search aria-hidden="true" />
                                Search jobs
                            </Button>
                        </form>

                        <div
                            className="jobs-filter-row"
                            role="group"
                            aria-label="Filter jobs"
                        >
                            {FILTERS.map((filter) => {
                                const Icon = FILTER_ICONS[filter];
                                const isActive = state.active.includes(filter);
                                const count = filterCounts[filter];
                                // A toggle that would return nothing is not
                                // worth pressing, but an active one stays
                                // live so it can always be switched back off.
                                const isEmpty = count === 0 && !isActive;

                                return (
                                    <button
                                        key={filter}
                                        type="button"
                                        className={cn(
                                            'jobs-filter-pill',
                                            isActive && 'active',
                                            isEmpty && 'is-empty',
                                        )}
                                        aria-pressed={isActive}
                                        disabled={isEmpty}
                                        onClick={() => toggleFilter(filter)}
                                        data-testid={`filter-${filter}`}
                                    >
                                        <Icon aria-hidden="true" />
                                        {JOB_FILTER_LABELS[filter]}
                                        <span className="jobs-filter-count">
                                            {count}
                                        </span>
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
                                {results.length} verified{' '}
                                {results.length === 1 ? 'role' : 'roles'}{' '}
                                available
                            </span>
                        </p>
                    </div>
                </div>
            </section>

            <section className="jobs-results-section" aria-label="Job results">
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
                                    {loadedJobs.map((job) => (
                                        <JobCard
                                            key={job.id}
                                            job={job}
                                            isSelected={
                                                selectedJob?.id === job.id
                                            }
                                            isSaved={isSaved(job.id)}
                                            onSelect={() => selectJob(job.id)}
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
                                    {hasMore && (
                                        <div className="jobs-load-more">
                                            <div
                                                className="applications-loader"
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
                                                Loading more roles
                                            </div>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                className="w-full"
                                                onClick={() =>
                                                    setLoadedCount((current) =>
                                                        Math.min(
                                                            current +
                                                                BATCH_SIZE,
                                                            results.length,
                                                        ),
                                                    )
                                                }
                                                data-testid="button-jobs-load-more"
                                            >
                                                Load more roles
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="jobs-detail-column">
                            {selectedJob ? (
                                <JobDetailPanel
                                    job={selectedJob}
                                    isSaved={isSaved(selectedJob.id)}
                                    isApplied={isApplied(selectedJob.id)}
                                    applyHref={applyHrefFor(selectedJob.id)}
                                    viewAllHref={jobShow.url(selectedJob.id)}
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
                                        Select a listing to read the full
                                        detail.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {results.length === 0 && hasAnyFilter && (
                        <p className="mt-6 text-center text-sm text-[var(--slate)]">
                            Looking for something specific?{' '}
                            <button
                                type="button"
                                className="font-semibold text-[var(--teal)] underline underline-offset-4 hover:text-[var(--navy)]"
                                onClick={clearFilters}
                                data-testid="link-jobs-browse-all"
                            >
                                Browse all verified roles
                            </button>
                        </p>
                    )}
                </div>
            </section>
        </>
    );
}
