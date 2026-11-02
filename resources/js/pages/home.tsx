import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, Building2, MapPin, Search, Ship } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AgencyCard } from '@/components/site/agency-card';
import { JobListingCard } from '@/components/site/job-listing-card';
import { countryOptions } from '@/data/countries';
import { homeResources } from '@/data/home-resources';
import { index as agenciesIndex } from '@/routes/agencies';
import { index as jobsIndex } from '@/routes/jobs';
import type { Pathway } from '@/types/agency';
import type {
    PublicAgencyCard,
    PublicJobPostCard,
} from '@/types/public-catalog';

type PerPathway<T> = Record<Pathway, T>;

type HomeProps = {
    agencies: PerPathway<PublicAgencyCard[]>;
    topHirers: PerPathway<PublicAgencyCard[]>;
    jobs: PerPathway<PublicJobPostCard[]>;
    stats: {
        agencies: PerPathway<number>;
        topHirers: PerPathway<number>;
        jobs: PerPathway<number>;
    };
};

function plural(count: number, singular: string, pluralForm: string): string {
    return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Sends a search to the jobs page, which reads `q` and `country` on load. */
function searchJobs(query: { q?: string; country?: string }): void {
    const params: Record<string, string> = {};

    if (query.q?.trim()) {
        params.q = query.q.trim();
    }

    if (query.country?.trim()) {
        params.country = query.country.trim();
    }

    router.visit(jobsIndex.url({ query: params }));
}

function ArrowUpRightIcon() {
    return (
        <ArrowRight size={15} className="arrow-up-right" aria-hidden="true" />
    );
}

export default function Home({ agencies, topHirers, jobs, stats }: HomeProps) {
    const [search, setSearch] = useState({ keyword: '', location: '' });
    const [countryOpen, setCountryOpen] = useState(false);
    const [agencyPathway, setAgencyPathway] = useState<Pathway>('landbased');
    const [topHirerPathway, setTopHirerPathway] =
        useState<Pathway>('landbased');
    const [jobPathway, setJobPathway] = useState<Pathway>('landbased');
    const [saved, setSaved] = useState<string[]>([]);

    const activeAgencies = agencies[agencyPathway];
    const activeTopHirers = topHirers[topHirerPathway];
    const activeJobs = jobs[jobPathway];

    const matchingCountries = useMemo(() => {
        const query = search.location.trim().toLowerCase();

        if (!query) {
            return countryOptions;
        }

        return countryOptions.filter((country) =>
            country.toLowerCase().includes(query),
        );
    }, [search.location]);

    const toggleSaved = (id: string) => {
        setSaved((current) =>
            current.includes(id)
                ? current.filter((savedId) => savedId !== id)
                : [...current, id],
        );
    };

    const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        searchJobs({ q: search.keyword, country: search.location });
    };

    return (
        <>
            <Head title="OPAP Job Abroad — Verified overseas work for Filipinos" />
            <meta
                name="description"
                content="Find verified landbased and seabased jobs from DMW-accredited Philippine recruitment agencies."
            />

            <section className="hero">
                <div
                    className="hero-photo"
                    role="img"
                    aria-label="A Filipino port worker in a safety helmet looking across a working harbor"
                />
                <div className="hero-wash" />
                <div className="shell hero-content">
                    <div className="hero-copy">
                        <h1>Overseas jobs you can verify before you apply.</h1>
                        <p className="hero-lede">
                            Find verified overseas jobs from DMW-accredited
                            Philippine recruitment agencies — landbased and
                            seabased.
                        </p>
                        <form
                            className="hero-search"
                            onSubmit={handleSearch}
                            aria-label="Search overseas jobs"
                        >
                            <div className="search-field search-keyword">
                                <Search size={18} aria-hidden="true" />
                                <input
                                    id="hero-keyword"
                                    aria-label="Job title or skill"
                                    value={search.keyword}
                                    onChange={(event) =>
                                        setSearch({
                                            ...search,
                                            keyword: event.target.value,
                                        })
                                    }
                                    placeholder="e.g. Welder, nurse"
                                    data-testid="input-hero-keyword"
                                />
                            </div>
                            <div
                                className={`search-field search-location ${countryOpen ? 'is-open' : ''}`}
                            >
                                <MapPin size={18} aria-hidden="true" />
                                <input
                                    id="hero-location"
                                    aria-label="Country or region"
                                    value={search.location}
                                    onChange={(event) => {
                                        setSearch({
                                            ...search,
                                            location: event.target.value,
                                        });
                                        setCountryOpen(true);
                                    }}
                                    placeholder="e.g. Canada, Gulf"
                                    data-testid="input-hero-location"
                                    role="combobox"
                                    aria-expanded={countryOpen}
                                    aria-controls="hero-country-options"
                                    autoComplete="off"
                                    onFocus={() => setCountryOpen(true)}
                                    onBlur={() => {
                                        window.setTimeout(
                                            () => setCountryOpen(false),
                                            120,
                                        );
                                    }}
                                />
                                {countryOpen && (
                                    <div
                                        className="hero-country-options"
                                        id="hero-country-options"
                                        role="listbox"
                                        data-testid="listbox-hero-country-options"
                                    >
                                        {matchingCountries.length > 0 ? (
                                            matchingCountries.map((country) => (
                                                <button
                                                    type="button"
                                                    role="option"
                                                    aria-selected={
                                                        search.location ===
                                                        country
                                                    }
                                                    key={country}
                                                    data-testid={`option-hero-country-${country}`}
                                                    onMouseDown={(event) =>
                                                        event.preventDefault()
                                                    }
                                                    onClick={() => {
                                                        setSearch({
                                                            ...search,
                                                            location: country,
                                                        });
                                                        setCountryOpen(false);
                                                    }}
                                                >
                                                    {country}
                                                </button>
                                            ))
                                        ) : (
                                            <span className="hero-country-empty">
                                                No matching countries
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="search-submit"
                                aria-label="Search jobs"
                                data-testid="button-hero-search"
                            >
                                <Search size={19} />
                                <span>Search jobs</span>
                            </button>
                        </form>
                        <div className="popular-searches">
                            <span>Popular searches</span>
                            <Link
                                href={jobsIndex.url({ query: { q: 'Nurse' } })}
                                data-testid="link-popular-nurse"
                            >
                                Nurse
                            </Link>
                            <Link
                                href={jobsIndex.url({ query: { q: 'Driver' } })}
                                data-testid="link-popular-driver"
                            >
                                Driver
                            </Link>
                            <Link
                                href={jobsIndex.url({
                                    query: { filter: 'seabased' },
                                })}
                                data-testid="link-popular-seafarer"
                            >
                                Seafarer
                            </Link>
                            <Link
                                href={jobsIndex.url({
                                    query: { country: 'Saudi Arabia' },
                                })}
                                data-testid="link-popular-saudi"
                            >
                                Saudi Arabia
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section pathways-section" id="agencies">
                <div className="shell">
                    <div className="section-heading-row">
                        <div>
                            <h2>
                                People you can
                                <br />
                                <em>follow up with.</em>
                            </h2>
                        </div>
                        <p className="section-intro">
                            Skip the anonymous listings. Explore DMW-accredited
                            agencies with clear specialties, direct contact
                            points, and jobs they’re actively filling.
                        </p>
                    </div>
                    <div
                        className="pathway-tabs"
                        role="tablist"
                        aria-label="Agency pathway"
                    >
                        <button
                            className={
                                agencyPathway === 'landbased'
                                    ? 'pathway-tab active'
                                    : 'pathway-tab'
                            }
                            onClick={() => setAgencyPathway('landbased')}
                            role="tab"
                            aria-selected={agencyPathway === 'landbased'}
                            data-testid="tab-agencies-landbased"
                        >
                            <Building2 size={18} /> Landbased{' '}
                            <span>
                                {plural(
                                    stats.agencies.landbased,
                                    'agency',
                                    'agencies',
                                )}
                            </span>
                        </button>
                        <button
                            className={
                                agencyPathway === 'seabased'
                                    ? 'pathway-tab active'
                                    : 'pathway-tab'
                            }
                            onClick={() => setAgencyPathway('seabased')}
                            role="tab"
                            aria-selected={agencyPathway === 'seabased'}
                            data-testid="tab-agencies-seabased"
                        >
                            <Ship size={18} /> Seabased{' '}
                            <span>
                                {plural(
                                    stats.agencies.seabased,
                                    'agency',
                                    'agencies',
                                )}
                            </span>
                        </button>
                    </div>
                    <div className="agency-grid" role="tabpanel">
                        {activeAgencies.map((agency) => (
                            <AgencyCard
                                agency={agency}
                                key={agency.slug}
                                testId={`card-agency-${agency.slug}`}
                            />
                        ))}
                        {activeAgencies.length === 0 && (
                            <p
                                className="section-intro"
                                data-testid="text-agencies-empty"
                            >
                                No accredited agencies on this pathway yet.
                            </p>
                        )}
                    </div>
                    <a
                        className="text-link centered-link"
                        href={agenciesIndex.url()}
                        data-testid="link-view-all-agencies"
                    >
                        View all accredited agencies <ArrowRight size={17} />
                    </a>
                </div>
            </section>

            <section className="section top-hirers-section" id="top-hirers">
                <div className="shell">
                    <div className="section-heading-row">
                        <div>
                            <h2>
                                Top hirers,
                                <br />
                                <em>clear next steps.</em>
                            </h2>
                        </div>
                        <p className="section-intro">
                            See which accredited agencies are actively moving
                            candidates into interviews and placements across the
                            world.
                        </p>
                    </div>
                    <div
                        className="pathway-tabs"
                        role="tablist"
                        aria-label="Top hirer pathway"
                    >
                        <button
                            className={
                                topHirerPathway === 'landbased'
                                    ? 'pathway-tab active'
                                    : 'pathway-tab'
                            }
                            onClick={() => setTopHirerPathway('landbased')}
                            role="tab"
                            aria-selected={topHirerPathway === 'landbased'}
                            data-testid="tab-top-hirers-landbased"
                        >
                            <Building2 size={18} /> Landbased{' '}
                            <span>
                                {plural(
                                    stats.topHirers.landbased,
                                    'top hirer',
                                    'top hirers',
                                )}
                            </span>
                        </button>
                        <button
                            className={
                                topHirerPathway === 'seabased'
                                    ? 'pathway-tab active'
                                    : 'pathway-tab'
                            }
                            onClick={() => setTopHirerPathway('seabased')}
                            role="tab"
                            aria-selected={topHirerPathway === 'seabased'}
                            data-testid="tab-top-hirers-seabased"
                        >
                            <Ship size={18} /> Seabased{' '}
                            <span>
                                {plural(
                                    stats.topHirers.seabased,
                                    'top hirer',
                                    'top hirers',
                                )}
                            </span>
                        </button>
                    </div>
                    <div className="agency-grid" role="tabpanel">
                        {activeTopHirers.map((agency) => (
                            <AgencyCard
                                agency={agency}
                                key={agency.slug}
                                testId={`card-top-hirer-${agency.slug}`}
                            />
                        ))}
                        {activeTopHirers.length === 0 && (
                            <p
                                className="section-intro"
                                data-testid="text-top-hirers-empty"
                            >
                                No agency on this pathway has recorded a hire
                                yet.
                            </p>
                        )}
                    </div>
                    <Link
                        className="text-link centered-link"
                        href={jobsIndex.url({
                            query: { filter: topHirerPathway },
                        })}
                        data-testid="link-top-hirers-jobs"
                    >
                        See roles from top hirers <ArrowRight size={17} />
                    </Link>
                </div>
            </section>

            <section className="section jobs-section" id="jobs">
                <div className="shell">
                    <div className="jobs-heading">
                        <div>
                            <h2>
                                Start with a job.
                                <br />
                                <em>Stay for the clarity.</em>
                            </h2>
                        </div>
                        <Link
                            className="text-link"
                            href={jobsIndex.url()}
                            data-testid="link-view-all-jobs"
                        >
                            See all jobs <ArrowRight size={17} />
                        </Link>
                    </div>
                    <div className="job-switcher-row">
                        <div
                            className="pathway-tabs compact"
                            role="tablist"
                            aria-label="Job pathway"
                        >
                            <button
                                className={
                                    jobPathway === 'landbased'
                                        ? 'pathway-tab active'
                                        : 'pathway-tab'
                                }
                                onClick={() => setJobPathway('landbased')}
                                role="tab"
                                aria-selected={jobPathway === 'landbased'}
                                data-testid="tab-jobs-landbased"
                            >
                                <Building2 size={17} /> Landbased
                            </button>
                            <button
                                className={
                                    jobPathway === 'seabased'
                                        ? 'pathway-tab active'
                                        : 'pathway-tab'
                                }
                                onClick={() => setJobPathway('seabased')}
                                role="tab"
                                aria-selected={jobPathway === 'seabased'}
                                data-testid="tab-jobs-seabased"
                            >
                                <Ship size={17} /> Seabased
                            </button>
                        </div>
                        <span className="results-count">
                            {plural(
                                stats.jobs[jobPathway],
                                'verified result',
                                'verified results',
                            )}
                        </span>
                    </div>
                    <div className="jobs-list">
                        {activeJobs.map((job, index) => (
                            <JobListingCard
                                key={job.id}
                                job={job}
                                highlighted={index === 0}
                                anchorId={
                                    index === 0
                                        ? `${jobPathway}-jobs`
                                        : undefined
                                }
                                isSaved={saved.includes(job.id)}
                                onToggleSaved={() => toggleSaved(job.id)}
                                testId={`card-job-${job.id}`}
                            />
                        ))}
                        {activeJobs.length === 0 && (
                            <p
                                className="section-intro"
                                data-testid="text-jobs-empty"
                            >
                                No open job posts on this pathway right now.
                            </p>
                        )}
                    </div>
                </div>
            </section>

            <section className="verification-section">
                <div className="map-detail" aria-hidden="true">
                    <span className="map-dot dot-a" />
                    <span className="map-dot dot-b" />
                    <span className="map-dot dot-c" />
                    <span className="map-line line-a" />
                    <span className="map-line line-b" />
                </div>
                <div className="shell verification-grid">
                    <div className="verification-copy">
                        <h2>
                            A better way to
                            <br />
                            <em>go further.</em>
                        </h2>
                        <p>
                            Overseas work is a big decision. OPAP helps you take
                            it one informed step at a time — from first search
                            to first day on the job.
                        </p>
                        <a
                            className="button-light"
                            href="#resources"
                            data-testid="link-verification-guide"
                        >
                            Explore the field guide <ArrowRight size={17} />
                        </a>
                    </div>
                    <div className="verification-list">
                        <div className="verification-item">
                            <span>01</span>
                            <div>
                                <h3>Find the signal</h3>
                                <p>
                                    Search roles that show their employer,
                                    location, pay range, and accredited agency.
                                </p>
                            </div>
                        </div>
                        <div className="verification-item">
                            <span>02</span>
                            <div>
                                <h3>Know the process</h3>
                                <p>
                                    See what documents, interviews, and fees to
                                    expect before you commit.
                                </p>
                            </div>
                        </div>
                        <div className="verification-item">
                            <span>03</span>
                            <div>
                                <h3>Move with confidence</h3>
                                <p>
                                    Save your shortlist, ask better questions,
                                    and keep a record of your next step.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section resources-section" id="resources">
                <div className="shell">
                    <div className="section-heading-row resources-heading">
                        <div>
                            <h2>
                                Useful before
                                <br />
                                <em>you’re ready.</em>
                            </h2>
                        </div>
                        <p className="section-intro">
                            Good decisions start before you apply. Straight
                            answers for the questions jobseekers actually ask.
                        </p>
                    </div>
                    <div className="resource-grid">
                        {homeResources.map(
                            (
                                {
                                    icon: ResourceIcon,
                                    eyebrow,
                                    title,
                                    body,
                                    href,
                                },
                                index,
                            ) => (
                                <a
                                    className={`resource-card resource-card-${index + 1}`}
                                    href={href}
                                    key={title}
                                    data-testid={`card-resource-${index + 1}`}
                                >
                                    <span className="resource-icon">
                                        <ResourceIcon size={21} />
                                    </span>
                                    <span className="resource-eyebrow">
                                        {eyebrow}
                                    </span>
                                    <h3>{title}</h3>
                                    <p>{body}</p>
                                    <span className="resource-arrow">
                                        <ArrowUpRightIcon />
                                    </span>
                                </a>
                            ),
                        )}
                    </div>
                    <a
                        className="text-link centered-link"
                        href="#resources"
                        data-testid="link-view-all-resources"
                    >
                        Browse all resources <ArrowRight size={17} />
                    </a>
                </div>
            </section>
        </>
    );
}
