import { Head, router } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    MapPin,
    Search,
    SearchX,
    Ship,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pagination } from '@/components/pagination';
import { AgencyCard } from '@/components/site/agency-card';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { index as agenciesIndex } from '@/routes/agencies';
import type { Pathway } from '@/types/agency';
import type { PublicAgencyCard } from '@/types/public-catalog';

const RESULTS_ANCHOR = 'agency-results';

/** How long typing settles before the directory is requested again. */
const SEARCH_DEBOUNCE_MS = 300;

type AgencyFilters = {
    pathway: Pathway;
    q: string;
    country: string;
    page: number;
};

type AgenciesIndexProps = {
    agencies: {
        items: PublicAgencyCard[];
        total: number;
        totalPages: number;
        page: number;
    };
    /** Places with an active job post on the current pathway. */
    countryOptions: string[];
    filters: AgencyFilters;
};

function scrollToResults(): void {
    window.requestAnimationFrame(() => {
        document
            .getElementById(RESULTS_ANCHOR)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

function sameFilters(a: AgencyFilters, b: AgencyFilters): boolean {
    return (
        a.pathway === b.pathway &&
        a.q === b.q &&
        a.country === b.country &&
        a.page === b.page
    );
}

/**
 * The query string for a directory page. The URL carries every filter, so a
 * reload or a shared link lands on exactly the same results.
 */
function directoryQuery(
    filters: AgencyFilters,
): Record<string, string | number> {
    const query: Record<string, string | number> = { pathway: filters.pathway };

    if (filters.q) {
        query.q = filters.q;
    }

    if (filters.country) {
        query.country = filters.country;
    }

    if (filters.page > 1) {
        query.page = filters.page;
    }

    return query;
}

export default function AgenciesIndex({
    agencies: results,
    countryOptions,
    filters,
}: AgenciesIndexProps) {
    const [keyword, setKeyword] = useState(filters.q);
    const [countryQuery, setCountryQuery] = useState(filters.country);
    const [countryOpen, setCountryOpen] = useState(false);
    /** True while a request is in flight; the current results dim. */
    const [isResolving, setIsResolving] = useState(false);
    /** The pathway just clicked, shown as active while the server catches up. */
    const [pendingPathway, setPendingPathway] = useState<Pathway | null>(null);

    const latestVisit = useRef(0);
    const isVisiting = useRef(false);
    /** What the server last answered for. */
    const filtersRef = useRef(filters);
    filtersRef.current = filters;
    /**
     * The search the reader last asked for, which runs ahead of `filters`
     * while a request is in flight. Every request is built from this, so a
     * keyword landing mid-request never drops a country just picked, or the
     * other way round.
     */
    const intendedRef = useRef<AgencyFilters>(filters);

    // Page props that change without a request from here (back / forward)
    // become the new intent, and the inputs follow them.
    useEffect(() => {
        if (isVisiting.current || sameFilters(intendedRef.current, filters)) {
            return;
        }

        intendedRef.current = filters;
        setKeyword(filters.q);
        setCountryQuery(filters.country);
    }, [filters]);

    const searchInput = useMemo(
        () => ({ q: keyword, country: countryQuery }),
        [keyword, countryQuery],
    );
    const search = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

    /**
     * Asks the server for a directory page; a different search starts again
     * from the first page. `scroll` brings the results into view, which only
     * suits a deliberate action: mid-typing it would pull the input away.
     */
    const update = useCallback(
        (next: Partial<AgencyFilters>, scroll: boolean = true) => {
            const current = intendedRef.current;
            const merged = { ...current, ...next };
            const isNewSearch =
                merged.pathway !== current.pathway ||
                merged.q !== current.q ||
                merged.country !== current.country;
            const target = { ...merged, page: isNewSearch ? 1 : merged.page };
            const visitNumber = ++latestVisit.current;
            let succeeded = false;

            intendedRef.current = target;
            isVisiting.current = true;
            setPendingPathway(target.pathway);

            router.get(agenciesIndex.url(), directoryQuery(target), {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setIsResolving(true),
                onSuccess: () => {
                    succeeded = true;

                    if (scroll) {
                        scrollToResults();
                    }
                },
                // A visit cancelled by a newer one must not clear the newer state.
                onFinish: () => {
                    if (visitNumber !== latestVisit.current) {
                        return;
                    }

                    // A failed visit leaves the page on what the server last
                    // answered, so the intent falls back to it too.
                    if (!succeeded) {
                        intendedRef.current = filtersRef.current;
                    }

                    isVisiting.current = false;
                    setIsResolving(false);
                    setPendingPathway(null);
                },
            });
        },
        [],
    );

    // Typing settles, then the directory follows it.
    useEffect(() => {
        const q = search.q.trim();
        const country = search.country.trim();
        const current = intendedRef.current;

        if (q !== current.q || country !== current.country) {
            update({ q, country }, false);
        }
    }, [search, update]);

    const matchingCountries = useMemo(() => {
        const query = countryQuery.trim().toLowerCase();

        // A finished choice lists everything again, so it can be changed
        // without first deleting it.
        if (
            !query ||
            countryOptions.some((option) => option.toLowerCase() === query)
        ) {
            return countryOptions;
        }

        return countryOptions.filter((country) =>
            country.toLowerCase().includes(query),
        );
    }, [countryOptions, countryQuery]);

    /** Enter skips the debounce rather than waiting for it to settle. */
    const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setCountryOpen(false);
        update({ q: keyword.trim(), country: countryQuery.trim() });
    };

    const activePathway = pendingPathway ?? filters.pathway;

    return (
        <>
            <Head title="Find DMW-Accredited Recruitment Agencies | OPAP Job Abroad">
                <meta
                    name="description"
                    content="Browse verified landbased and seabased recruitment agencies accredited for Filipino jobseekers."
                />
            </Head>

            <section className="agencies-hero" aria-labelledby="agencies-title">
                <div className="shell agencies-hero-inner">
                    <h1 id="agencies-title">
                        Find an agency
                        <br />
                        <em>you can trust.</em>
                    </h1>
                    <p className="agencies-hero-lede">
                        Browse DMW-accredited recruitment agencies with clear
                        specialties, current openings, and direct next steps for
                        your overseas journey.
                    </p>
                </div>
            </section>

            <section
                className="agencies-search-section"
                aria-labelledby="agency-search-title"
            >
                <div className="shell">
                    <div className="agencies-search-card">
                        <div className="agencies-search-heading">
                            <div>
                                <div
                                    className="eyebrow"
                                    id="agency-search-title"
                                >
                                    <span className="eyebrow-rule" /> SEARCH THE
                                    DIRECTORY
                                </div>
                                <h2>Start with the right partner.</h2>
                            </div>
                            <p>
                                Search by agency name or narrow the directory by
                                the country and pathway you have in mind.
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
                                        maxLength={100}
                                        onChange={(event) =>
                                            setKeyword(event.target.value)
                                        }
                                        placeholder="Search DMW-accredited landbased and seabased agencies"
                                        aria-label="Search DMW-accredited agencies"
                                        data-testid="input-agencies-keyword"
                                    />
                                </div>
                            </label>
                            <div
                                className={`agency-search-field agency-country-field ${
                                    countryOpen ? 'is-open' : ''
                                }`}
                            >
                                <div>
                                    <MapPin size={18} aria-hidden="true" />
                                    <input
                                        type="text"
                                        value={countryQuery}
                                        maxLength={100}
                                        placeholder="All countries and regions"
                                        aria-label="Search for a country or region"
                                        role="combobox"
                                        aria-expanded={countryOpen}
                                        aria-controls="agency-country-options"
                                        autoComplete="off"
                                        data-testid="input-agencies-country"
                                        onFocus={() => setCountryOpen(true)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Escape') {
                                                setCountryOpen(false);
                                            }
                                        }}
                                        onChange={(event) => {
                                            setCountryQuery(event.target.value);
                                            setCountryOpen(true);
                                        }}
                                        onBlur={() => {
                                            window.setTimeout(
                                                () => setCountryOpen(false),
                                                120,
                                            );
                                        }}
                                    />
                                </div>
                                {countryOpen && (
                                    <div
                                        className="agency-country-options"
                                        id="agency-country-options"
                                        role="listbox"
                                    >
                                        {matchingCountries.length > 0 ? (
                                            matchingCountries.map((country) => (
                                                <button
                                                    type="button"
                                                    role="option"
                                                    aria-selected={
                                                        countryQuery === country
                                                    }
                                                    key={country}
                                                    onMouseDown={(event) =>
                                                        event.preventDefault()
                                                    }
                                                    onClick={() => {
                                                        setCountryQuery(
                                                            country,
                                                        );
                                                        setCountryOpen(false);
                                                        update({ country });
                                                    }}
                                                    data-testid={`option-agencies-country-${country}`}
                                                >
                                                    {country}
                                                </button>
                                            ))
                                        ) : (
                                            <span className="agency-country-empty">
                                                No matching countries
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="agency-search-button"
                            >
                                Search agencies{' '}
                                <ArrowRight size={16} aria-hidden="true" />
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            <section
                className="section agencies-results-section"
                id={RESULTS_ANCHOR}
                aria-label="Agency directory"
            >
                <div className="shell">
                    <div
                        className="agency-pathway-toggle"
                        role="group"
                        aria-label="Agency pathway filter"
                    >
                        <button
                            type="button"
                            className={
                                activePathway === 'landbased' ? 'active' : ''
                            }
                            aria-pressed={activePathway === 'landbased'}
                            onClick={() => update({ pathway: 'landbased' })}
                            data-testid="filter-agencies-landbased"
                        >
                            <Building2 size={15} aria-hidden="true" /> Landbased
                        </button>
                        <button
                            type="button"
                            className={
                                activePathway === 'seabased' ? 'active' : ''
                            }
                            aria-pressed={activePathway === 'seabased'}
                            onClick={() => update({ pathway: 'seabased' })}
                            data-testid="filter-agencies-seabased"
                        >
                            <Ship size={15} aria-hidden="true" /> Seabased
                        </button>
                    </div>

                    {results.total > 0 ? (
                        <div className="agencies-grid" aria-busy={isResolving}>
                            {results.items.map((agency) => (
                                <AgencyCard
                                    agency={agency}
                                    key={agency.slug}
                                    testId={`card-directory-agency-${agency.slug}`}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="agency-empty-state">
                            <SearchX size={34} aria-hidden="true" />
                            <h3>No agencies match your search</h3>
                            <p>Try a different name or country.</p>
                            <a
                                href="#"
                                onClick={(event) => {
                                    event.preventDefault();
                                    setKeyword('');
                                    setCountryQuery('');
                                    update({ q: '', country: '', page: 1 });
                                }}
                            >
                                Clear filters
                            </a>
                        </div>
                    )}

                    <Pagination
                        page={results.page}
                        totalPages={results.totalPages}
                        label="Agency directory pagination"
                        testIdPrefix="agency-pagination"
                        onPageChange={(page) => update({ page })}
                    />
                </div>
            </section>
        </>
    );
}
