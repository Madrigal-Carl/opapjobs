import { Head, router } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    MapPin,
    Search,
    SearchX,
    Ship,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pagination } from '@/components/pagination';
import { AgencyCard } from '@/components/site/agency-card';
import { countryOptions } from '@/data/countries';
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
    pathwayCounts: Record<Pathway, number>;
    filters: AgencyFilters;
};

function scrollToResults(): void {
    window.requestAnimationFrame(() => {
        document
            .getElementById(RESULTS_ANCHOR)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

/**
 * Asks the server for another directory page. The URL carries every
 * filter, so a reload or a shared link lands on exactly the same results.
 */
function visit(filters: AgencyFilters): void {
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

    router.get(agenciesIndex.url(), query, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        onSuccess: scrollToResults,
    });
}

export default function AgenciesIndex({
    agencies: results,
    pathwayCounts,
    filters,
}: AgenciesIndexProps) {
    const [keyword, setKeyword] = useState(filters.q);
    const [countryQuery, setCountryQuery] = useState(filters.country);
    const [countryOpen, setCountryOpen] = useState(false);
    const debouncedKeyword = useDebouncedValue(keyword, SEARCH_DEBOUNCE_MS);
    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    const update = (next: Partial<AgencyFilters>) => {
        const current = filtersRef.current;
        const merged = { ...current, ...next };
        const resetPage =
            merged.pathway !== current.pathway ||
            merged.q !== current.q ||
            merged.country !== current.country;

        visit({ ...merged, page: resetPage ? 1 : (next.page ?? current.page) });
    };

    // Typing settles, then the directory follows it.
    useEffect(() => {
        const q = debouncedKeyword.trim();

        if (q !== filtersRef.current.q) {
            update({ q });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedKeyword]);

    const matchingCountries = useMemo(() => {
        const query = countryQuery.trim().toLowerCase();

        if (!query) {
            return countryOptions;
        }

        return countryOptions.filter((country) =>
            country.toLowerCase().includes(query),
        );
    }, [countryQuery]);

    const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        update({ q: keyword.trim(), country: countryQuery.trim() });
    };

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
                                        onChange={(event) =>
                                            setKeyword(event.target.value)
                                        }
                                        placeholder="Search DMW-accredited landbased and seabased agencies"
                                        aria-label="Search DMW-accredited agencies"
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
                                        placeholder="All countries and regions"
                                        aria-label="Search for a country or region"
                                        role="combobox"
                                        aria-expanded={countryOpen}
                                        aria-controls="agency-country-options"
                                        autoComplete="off"
                                        onFocus={() => setCountryOpen(true)}
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
                                filters.pathway === 'landbased' ? 'active' : ''
                            }
                            aria-pressed={filters.pathway === 'landbased'}
                            onClick={() => update({ pathway: 'landbased' })}
                        >
                            <Building2 size={15} aria-hidden="true" /> Landbased{' '}
                            <span data-testid="count-agencies-landbased">
                                {pathwayCounts.landbased}
                            </span>
                        </button>
                        <button
                            type="button"
                            className={
                                filters.pathway === 'seabased' ? 'active' : ''
                            }
                            aria-pressed={filters.pathway === 'seabased'}
                            onClick={() => update({ pathway: 'seabased' })}
                        >
                            <Ship size={15} aria-hidden="true" /> Seabased{' '}
                            <span data-testid="count-agencies-seabased">
                                {pathwayCounts.seabased}
                            </span>
                        </button>
                    </div>

                    {results.total > 0 ? (
                        <div className="agencies-grid">
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
