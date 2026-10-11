import { Head } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    MapPin,
    Search,
    SearchX,
    Ship,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pagination } from '@/components/pagination';
import { AgencyCard } from '@/components/site/agency-card';
import { countryOptions } from '@/data/countries';
import { AGENCIES_PER_PAGE, getAgencyPage } from '@/data/selectors';
import type { Pathway } from '@/types/agency';

const RESULTS_ANCHOR = 'agency-results';

type AgencyFilters = {
    pathway: Pathway;
    page: number;
    q: string;
};

function readFilters(): AgencyFilters {
    if (typeof window === 'undefined') {
        return { pathway: 'landbased', page: 1, q: '' };
    }

    const params = new URLSearchParams(window.location.search);
    const parsedPage = Number(params.get('page'));

    return {
        pathway:
            params.get('pathway') === 'seabased' ? 'seabased' : 'landbased',
        page:
            Number.isFinite(parsedPage) && parsedPage > 0
                ? Math.trunc(parsedPage)
                : 1,
        q: (params.get('q') ?? '').slice(0, 100),
    };
}

function writeUrl(filters: AgencyFilters): void {
    const params = new URLSearchParams();
    params.set('pathway', filters.pathway);

    if (filters.page > 1) {
        params.set('page', String(filters.page));
    }

    if (filters.q) {
        params.set('q', filters.q);
    }

    const url = `${window.location.pathname}?${params.toString()}#${RESULTS_ANCHOR}`;
    window.history.replaceState(window.history.state, '', url);
}

function scrollToResults(): void {
    window.requestAnimationFrame(() => {
        document
            .getElementById(RESULTS_ANCHOR)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

function useAgencyFilters() {
    const [filters, setFilters] = useState<AgencyFilters>(readFilters);

    useEffect(() => {
        const onPopState = () => setFilters(readFilters());
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    useEffect(() => {
        writeUrl(filters);
    }, [filters]);

    const update = useCallback((next: Partial<AgencyFilters>) => {
        setFilters((current) => {
            const resetPage =
                (next.pathway !== undefined &&
                    next.pathway !== current.pathway) ||
                (next.q !== undefined && next.q !== current.q);

            return {
                ...current,
                ...next,
                page: resetPage ? 1 : (next.page ?? current.page),
            };
        });
        scrollToResults();
    }, []);

    return { filters, update };
}

export default function AgenciesIndex() {
    const { filters, update } = useAgencyFilters();
    const [keyword, setKeyword] = useState(filters.q);
    const [countryQuery, setCountryQuery] = useState('');
    const [countryOpen, setCountryOpen] = useState(false);

    const results = getAgencyPage({
        pathway: filters.pathway,
        q: filters.q,
        page: filters.page,
        perPage: AGENCIES_PER_PAGE,
    });

    useEffect(() => {
        setKeyword(filters.q);
    }, [filters.q]);

    useEffect(() => {
        if (filters.page !== results.page) {
            update({ page: results.page });
        }
    }, [filters.page, results.page, update]);

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
        update({ q: keyword.trim() });
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
                            <Building2 size={15} aria-hidden="true" /> Landbased
                        </button>
                        <button
                            type="button"
                            className={
                                filters.pathway === 'seabased' ? 'active' : ''
                            }
                            aria-pressed={filters.pathway === 'seabased'}
                            onClick={() => update({ pathway: 'seabased' })}
                        >
                            <Ship size={15} aria-hidden="true" /> Seabased
                        </button>
                    </div>

                    {results.total > 0 ? (
                        <div className="agencies-grid">
                            {results.items.map((agency) => (
                                <AgencyCard
                                    agency={agency}
                                    key={agency.slug}
                                    testId={`card-directory-agency-${agency.mark}`}
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
                                    update({ q: '', page: 1 });
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
