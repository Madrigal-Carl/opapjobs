import { Head } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    BriefcaseBusiness,
    Building2,
    Check,
    Clock3,
    ExternalLink,
    Facebook,
    Instagram,
    Mail,
    MapPin,
    MessageCircle,
    MessageSquare,
    Phone,
    Ship,
    Star,
    UsersRound,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Pagination } from '@/components/pagination';
import { AppLogo } from '@/components/site/app-logo';
import { JobCard } from '@/components/site/job-card';
import { NotFound } from '@/components/site/not-found';
import { getAgencyBySlug, getJobsByAgency } from '@/data/selectors';
import type { AgencySocial } from '@/types/agency';

type ProfileTab = 'overview' | 'jobs' | 'reviews';

const reviewInputClasses =
    'w-full rounded-md border border-[var(--line)] bg-[var(--cream)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal)] focus:ring-offset-2 focus:ring-offset-white';

const reviewLabelClasses =
    'mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--navy)]';

function StarRating({ rating }: { rating: number }) {
    return (
        <span
            className="inline-flex items-center gap-1 text-[var(--amber)]"
            aria-label={`${rating} out of 5 stars`}
        >
            {Array.from({ length: 5 }).map((_, index) => (
                <Star
                    key={index}
                    size={15}
                    fill={index < Math.round(rating) ? 'currentColor' : 'none'}
                    aria-hidden="true"
                />
            ))}
        </span>
    );
}

function XIcon({ size }: { size: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817-5.967 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
        </svg>
    );
}

function SocialLinks({
    social,
    compact = false,
}: {
    social?: AgencySocial;
    compact?: boolean;
}) {
    const links = [
        {
            href: social?.facebook,
            label: 'Facebook',
            testId: 'link-agency-facebook',
            icon: <Facebook size={compact ? 16 : 17} aria-hidden="true" />,
        },
        {
            href: social?.instagram,
            label: 'Instagram',
            testId: 'link-agency-instagram',
            icon: <Instagram size={compact ? 16 : 17} aria-hidden="true" />,
        },
        {
            href: social?.x,
            label: 'X',
            testId: 'link-agency-x',
            icon: <XIcon size={compact ? 16 : 17} />,
        },
    ];

    return (
        <div className={`flex items-center gap-2 ${compact ? '' : 'mt-5'}`}>
            {links.map(
                ({ href, label, testId, icon }) =>
                    href && (
                        <a
                            key={label}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--teal)] transition outline-none hover:border-[var(--teal)] hover:bg-[var(--teal-light)] focus:ring-2 focus:ring-[var(--teal)] focus:ring-offset-2"
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Visit agency ${label}`}
                            data-testid={compact ? `${testId}-compact` : testId}
                        >
                            {icon}
                        </a>
                    ),
            )}
        </div>
    );
}

function PathwayBadge({ pathway }: { pathway: 'landbased' | 'seabased' }) {
    const PathwayIcon = pathway === 'landbased' ? Building2 : Ship;

    return (
        <span className="agency-pathway-tag" data-testid="badge-pathway">
            <PathwayIcon size={13} aria-hidden="true" />
            {pathway === 'landbased' ? 'Landbased' : 'Seabased'}
        </span>
    );
}

type AgencyProfileProps = {
    slug: string;
};

export default function AgencyProfilePage({ slug }: AgencyProfileProps) {
    const agency = getAgencyBySlug(slug);
    const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
    const [selectedJobId, setSelectedJobId] = useState('');
    const [savedJobs, setSavedJobs] = useState<Record<string, boolean>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [currentReviewPage, setCurrentReviewPage] = useState(1);
    const [submittedReviews, setSubmittedReviews] = useState<
        { reviewer: string; rating: number; date: string; comment: string }[]
    >([]);
    const [selectedRating, setSelectedRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewError, setReviewError] = useState('');
    const [reviewSuccess, setReviewSuccess] = useState('');

    const agencyJobs = useMemo(
        () => (agency ? getJobsByAgency(agency.name) : []),
        [agency],
    );
    const reviews = useMemo(
        () => [...submittedReviews, ...(agency?.reviews ?? [])],
        [agency, submittedReviews],
    );

    if (!agency) {
        return <NotFound />;
    }

    const jobsPerPage = 5;
    const reviewsPerPage = 5;
    const totalPages = Math.max(1, Math.ceil(agencyJobs.length / jobsPerPage));
    const reviewTotalPages = Math.max(
        1,
        Math.ceil(reviews.length / reviewsPerPage),
    );
    const paginatedJobs = agencyJobs.slice(
        (currentPage - 1) * jobsPerPage,
        currentPage * jobsPerPage,
    );
    const overviewJobs = agencyJobs.slice(0, 3);
    const overviewReviews = reviews.slice(0, 3);
    const paginatedReviews = reviews.slice(
        (currentReviewPage - 1) * reviewsPerPage,
        currentReviewPage * reviewsPerPage,
    );
    const averageRating = reviews.length
        ? reviews.reduce((total, review) => total + review.rating, 0) /
          reviews.length
        : Number(agency.rating);
    const ratingDisplay = averageRating.toFixed(1);
    const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => {
        const count = reviews.filter((review) => review.rating === star).length;

        return {
            star,
            percentage: reviews.length
                ? Math.round((count / reviews.length) * 100)
                : 0,
        };
    });
    const contact = agency.contact ?? {
        phone: '',
        email: '',
        address: agency.location,
    };

    const toggleSavedJob = (jobId: string) => {
        setSavedJobs((current) => ({ ...current, [jobId]: !current[jobId] }));
    };

    const changeJobPage = (page: number) => {
        setCurrentPage(Math.min(Math.max(page, 1), totalPages));
        setSelectedJobId('');
    };

    const changeReviewPage = (page: number) => {
        setCurrentReviewPage(Math.min(Math.max(page, 1), reviewTotalPages));
    };

    const handleReviewSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setReviewError('');
        setReviewSuccess('');

        if (!selectedRating || !reviewComment.trim()) {
            setReviewError(
                'Please select a star rating and share a comment before submitting.',
            );
            return;
        }

        const date = new Intl.DateTimeFormat('en-US', {
            month: 'long',
            year: 'numeric',
        }).format(new Date());

        // TODO: persist through the backend once the `submit agency review`
        // permission and endpoint exist. Local state only for now.
        setSubmittedReviews((current) => [
            {
                reviewer: 'Anonymous',
                rating: selectedRating,
                date,
                comment: reviewComment.trim(),
            },
            ...current,
        ]);
        setCurrentReviewPage(1);
        setReviewComment('');
        setSelectedRating(0);
        setHoverRating(0);
        setReviewSuccess(
            'Thanks for sharing your experience with this agency.',
        );
    };

    return (
        <>
            <Head title={`${agency.name} | OPAP Job Abroad`} />

            <section className="bg-[var(--navy-deep)] px-6 pt-[106px] pb-12 text-white sm:px-8 sm:pt-[122px] sm:pb-16">
                <div className="mx-auto max-w-6xl">
                    <div className="flex flex-col items-center gap-7 text-center lg:flex-row lg:items-end lg:justify-between lg:text-left">
                        <div className="flex min-w-0 flex-col items-center gap-5 sm:flex-row sm:items-end">
                            <AppLogo
                                className="h-28 w-28 shrink-0 rounded-md border-4 border-white bg-white p-4 shadow-lg sm:h-32 sm:w-32"
                                tone="navy"
                            />
                            <div className="min-w-0">
                                <h1 className="max-w-3xl font-serif text-3xl leading-[0.98] font-bold tracking-[-0.06em] sm:text-5xl">
                                    {agency.name}
                                </h1>
                                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-white/70 sm:justify-start">
                                    <span className="verified-pill text-[var(--teal-light)]">
                                        <BadgeCheck
                                            size={13}
                                            aria-hidden="true"
                                        />{' '}
                                        Verified
                                    </span>
                                    <PathwayBadge pathway={agency.pathway} />
                                    <span className="inline-flex items-center gap-2">
                                        <MapPin
                                            size={16}
                                            className="text-[var(--teal)]"
                                            aria-hidden="true"
                                        />
                                        {agency.location}
                                    </span>
                                    <span
                                        className="inline-flex items-center gap-1.5 text-white/85"
                                        data-testid="text-agency-rating"
                                    >
                                        <Star
                                            size={15}
                                            fill="currentColor"
                                            className="text-[var(--amber)]"
                                            aria-hidden="true"
                                        />
                                        <span>
                                            {ratingDisplay} ({reviews.length}{' '}
                                            reviews)
                                        </span>
                                    </span>
                                    {agency.topHirer && (
                                        <span className="top-hirer-pill">
                                            Top Hirer
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-center gap-3 lg:justify-start">
                            <a
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--amber)] px-5 text-sm font-bold text-[var(--ink)] transition outline-none hover:brightness-105 focus:ring-2 focus:ring-[var(--amber)] focus:ring-offset-2 focus:ring-offset-[var(--navy-deep)]"
                                href={
                                    agency.social?.website ??
                                    `mailto:${contact.email}`
                                }
                                target={
                                    agency.social?.website
                                        ? '_blank'
                                        : undefined
                                }
                                rel={
                                    agency.social?.website
                                        ? 'noreferrer'
                                        : undefined
                                }
                            >
                                {agency.social?.website
                                    ? 'Visit Website'
                                    : 'Message Agency'}
                                {agency.social?.website ? (
                                    <ExternalLink
                                        size={15}
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <MessageCircle
                                        size={16}
                                        aria-hidden="true"
                                    />
                                )}
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <div className="bg-[var(--cream)] px-6 py-6 sm:px-8 lg:py-8">
                <div className="mx-auto max-w-6xl">
                    <nav
                        className="border-b border-[var(--line)] bg-white/95 px-4 py-2 backdrop-blur sm:px-6"
                        aria-label="Agency profile sections"
                    >
                        <div
                            className="flex justify-center gap-7 overflow-x-auto sm:justify-start"
                            role="tablist"
                            aria-label="Agency profile tabs"
                        >
                            {[
                                { id: 'overview' as const, label: 'Overview' },
                                {
                                    id: 'jobs' as const,
                                    label: `Jobs (${agencyJobs.length})`,
                                },
                                {
                                    id: 'reviews' as const,
                                    label: `Reviews (${reviews.length})`,
                                },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    className={`min-h-14 shrink-0 border-b-2 px-1 text-sm font-semibold transition outline-none ${
                                        activeTab === tab.id
                                            ? 'border-[var(--teal)] text-[var(--navy)]'
                                            : 'border-transparent text-[var(--slate)] hover:text-[var(--navy)]'
                                    }`}
                                    type="button"
                                    id={`tab-${tab.id}`}
                                    role="tab"
                                    aria-selected={activeTab === tab.id}
                                    aria-controls={`panel-${tab.id}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    data-testid={`tab-${tab.id}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </nav>

                    <div className="mt-6 grid gap-12 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-16">
                        <div className="min-w-0">
                            {activeTab === 'overview' && (
                                <div
                                    id="panel-overview"
                                    role="tabpanel"
                                    aria-labelledby="tab-overview"
                                    tabIndex={0}
                                    className="outline-none"
                                >
                                    <section
                                        id="agency-overview"
                                        className="pt-6 lg:pt-8"
                                        aria-labelledby="agency-overview-title"
                                    >
                                        <h2
                                            id="agency-overview-title"
                                            className="font-serif text-4xl font-bold tracking-[-0.06em] text-[var(--navy)] sm:text-5xl"
                                        >
                                            A clearer way to move forward.
                                        </h2>
                                        <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--slate)]">
                                            {agency.description}
                                        </p>

                                        <div className="mt-9 overflow-hidden rounded-md border border-[var(--line)] bg-white shadow-sm">
                                            <div className="grid sm:grid-cols-3">
                                                <div className="border-b border-[var(--line)] p-5 sm:border-r sm:border-b-0">
                                                    <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[var(--teal)] uppercase">
                                                        Years in operation
                                                    </p>
                                                    <p className="mt-2 text-2xl font-bold text-[var(--navy)]">
                                                        {agency.yearsInOperation ??
                                                            '—'}
                                                    </p>
                                                </div>
                                                <div className="border-b border-[var(--line)] p-5 sm:border-r sm:border-b-0">
                                                    <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[var(--teal)] uppercase">
                                                        DMW license
                                                    </p>
                                                    <p className="mt-2 text-sm leading-6 font-semibold text-[var(--navy)]">
                                                        {agency.license}
                                                    </p>
                                                </div>
                                                <div className="p-5">
                                                    <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[var(--teal)] uppercase">
                                                        Pathway
                                                    </p>
                                                    <p className="mt-2 text-sm font-semibold text-[var(--navy)]">
                                                        {agency.pathway ===
                                                        'landbased'
                                                            ? 'Landbased'
                                                            : 'Seabased'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="border-t border-[var(--line)] p-6 sm:p-8">
                                                <div className="flex flex-wrap items-center justify-between gap-4">
                                                    <h3 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[var(--navy)]">
                                                        Contact and social
                                                    </h3>
                                                    <SocialLinks
                                                        social={agency.social}
                                                    />
                                                </div>
                                                <div className="mt-7 grid gap-5 sm:grid-cols-3">
                                                    <a
                                                        className="flex items-start gap-3 text-sm leading-6 text-[var(--slate)] outline-none hover:text-[var(--navy)] focus:ring-2 focus:ring-[var(--teal)]"
                                                        href={`tel:${contact.phone}`}
                                                    >
                                                        <Phone
                                                            size={18}
                                                            className="mt-1 shrink-0 text-[var(--teal)]"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            {contact.phone}
                                                        </span>
                                                    </a>
                                                    <a
                                                        className="flex items-start gap-3 text-sm leading-6 text-[var(--slate)] outline-none hover:text-[var(--navy)] focus:ring-2 focus:ring-[var(--teal)]"
                                                        href={`mailto:${contact.email}`}
                                                    >
                                                        <Mail
                                                            size={18}
                                                            className="mt-1 shrink-0 text-[var(--teal)]"
                                                            aria-hidden="true"
                                                        />
                                                        <span className="break-all">
                                                            {contact.email}
                                                        </span>
                                                    </a>
                                                    <div className="flex items-start gap-3 text-sm leading-6 text-[var(--slate)]">
                                                        <MapPin
                                                            size={18}
                                                            className="mt-1 shrink-0 text-[var(--teal)]"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            {contact.address}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <section
                                            className="mt-12"
                                            aria-labelledby="overview-jobs-preview-title"
                                            data-testid="section-overview-jobs-preview"
                                        >
                                            <div className="flex flex-wrap items-end justify-between gap-4">
                                                <div>
                                                    <h3
                                                        id="overview-jobs-preview-title"
                                                        className="font-serif text-3xl font-bold tracking-[-0.05em] text-[var(--navy)] sm:text-4xl"
                                                    >
                                                        Open{' '}
                                                        {agency.pathway ===
                                                        'landbased'
                                                            ? 'Landbased'
                                                            : 'Seabased'}{' '}
                                                        Positions
                                                    </h3>
                                                </div>
                                                <span className="font-mono text-xs tracking-[0.1em] text-[var(--slate)] uppercase">
                                                    {agencyJobs.length} verified
                                                    roles
                                                </span>
                                            </div>
                                            <div className="mt-7 space-y-3">
                                                {overviewJobs.length > 0 ? (
                                                    overviewJobs.map(
                                                        (job, index) => (
                                                            <JobCard
                                                                key={`overview-${job.id}`}
                                                                job={job}
                                                                isSelected={
                                                                    selectedJobId ===
                                                                        job.id ||
                                                                    (index ===
                                                                        0 &&
                                                                        !selectedJobId)
                                                                }
                                                                isSaved={
                                                                    !!savedJobs[
                                                                        job.id
                                                                    ]
                                                                }
                                                                onSelect={() =>
                                                                    setSelectedJobId(
                                                                        job.id,
                                                                    )
                                                                }
                                                                onToggleSaved={() =>
                                                                    toggleSavedJob(
                                                                        job.id,
                                                                    )
                                                                }
                                                                testId={`card-overview-job-${job.id}`}
                                                            />
                                                        ),
                                                    )
                                                ) : (
                                                    <div className="rounded-md border border-[var(--line)] bg-white p-8 text-center shadow-sm">
                                                        <BriefcaseBusiness
                                                            className="mx-auto text-[var(--teal)]"
                                                            size={28}
                                                            aria-hidden="true"
                                                        />
                                                        <h4 className="mt-4 font-serif text-2xl font-bold text-[var(--navy)]">
                                                            No open roles right
                                                            now.
                                                        </h4>
                                                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--slate)]">
                                                            Check back soon or
                                                            explore other
                                                            verified agencies on
                                                            OPAP Job Abroad.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            {agencyJobs.length > 3 && (
                                                <div className="mt-6 flex justify-center">
                                                    <button
                                                        className="text-sm font-semibold text-[var(--teal)] underline decoration-[var(--teal)] decoration-2 underline-offset-4 transition outline-none hover:text-[var(--navy)] focus:ring-2 focus:ring-[var(--teal)] focus:ring-offset-2 focus:ring-offset-[var(--cream)]"
                                                        type="button"
                                                        data-testid="button-overview-show-all-jobs"
                                                        onClick={() =>
                                                            setActiveTab('jobs')
                                                        }
                                                    >
                                                        Show other jobs
                                                    </button>
                                                </div>
                                            )}
                                        </section>

                                        <section
                                            className="mt-12"
                                            aria-labelledby="overview-reviews-preview-title"
                                            data-testid="section-overview-reviews-preview"
                                        >
                                            <div className="flex flex-wrap items-end justify-between gap-4">
                                                <div>
                                                    <h3
                                                        id="overview-reviews-preview-title"
                                                        className="font-serif text-3xl font-bold tracking-[-0.05em] text-[var(--navy)] sm:text-4xl"
                                                    >
                                                        Ratings &amp; Reviews
                                                    </h3>
                                                </div>
                                                <span className="font-mono text-xs tracking-[0.1em] text-[var(--slate)] uppercase">
                                                    {reviews.length} candidate{' '}
                                                    {reviews.length === 1
                                                        ? 'review'
                                                        : 'reviews'}
                                                </span>
                                            </div>
                                            <div className="mt-7 space-y-4">
                                                {overviewReviews.map(
                                                    (review) => (
                                                        <article
                                                            className="rounded-md border border-[var(--line)] bg-white p-6 shadow-sm"
                                                            key={`${review.reviewer}-${review.date}`}
                                                        >
                                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                                <div>
                                                                    <h4 className="font-semibold text-[var(--navy)]">
                                                                        {
                                                                            review.reviewer
                                                                        }
                                                                    </h4>
                                                                    <p className="mt-1 text-xs text-[var(--slate)]">
                                                                        {
                                                                            review.date
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <StarRating
                                                                    rating={
                                                                        review.rating
                                                                    }
                                                                />
                                                            </div>
                                                            <p className="mt-4 text-sm leading-7 text-[var(--slate)]">
                                                                {review.comment}
                                                            </p>
                                                        </article>
                                                    ),
                                                )}
                                                {overviewReviews.length ===
                                                    0 && (
                                                    <div className="rounded-md border border-[var(--line)] bg-white p-6 text-sm leading-7 text-[var(--slate)] shadow-sm">
                                                        No candidate reviews
                                                        yet.
                                                    </div>
                                                )}
                                            </div>
                                            {reviews.length > 3 && (
                                                <div className="mt-6 flex justify-center">
                                                    <button
                                                        className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--navy)] transition outline-none hover:border-[var(--teal)] hover:text-[var(--teal)] focus:ring-2 focus:ring-[var(--teal)] focus:ring-offset-2 focus:ring-offset-[var(--cream)]"
                                                        type="button"
                                                        data-testid="button-overview-show-other-reviews"
                                                        onClick={() =>
                                                            setActiveTab(
                                                                'reviews',
                                                            )
                                                        }
                                                    >
                                                        Show other reviews{' '}
                                                        <ArrowRight
                                                            size={16}
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                </div>
                                            )}
                                        </section>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'jobs' && (
                                <div
                                    id="panel-jobs"
                                    role="tabpanel"
                                    aria-labelledby="tab-jobs"
                                    tabIndex={0}
                                    className="mx-auto max-w-4xl outline-none"
                                >
                                    <section
                                        id="agency-jobs"
                                        className="mt-0"
                                        aria-labelledby="agency-jobs-title"
                                        data-testid="section-agency-jobs"
                                    >
                                        <div className="flex flex-wrap items-end justify-between gap-4">
                                            <div>
                                                <h2
                                                    id="agency-jobs-title"
                                                    className="font-serif text-3xl font-bold tracking-[-0.05em] text-[var(--navy)] sm:text-4xl"
                                                >
                                                    Open{' '}
                                                    {agency.pathway ===
                                                    'landbased'
                                                        ? 'Landbased'
                                                        : 'Seabased'}{' '}
                                                    Positions
                                                </h2>
                                            </div>
                                            <span className="font-mono text-xs tracking-[0.1em] text-[var(--slate)] uppercase">
                                                {agencyJobs.length} verified
                                                roles
                                            </span>
                                        </div>
                                        <div className="mt-7 space-y-3">
                                            {agencyJobs.length > 0 ? (
                                                paginatedJobs.map(
                                                    (job, index) => (
                                                        <JobCard
                                                            key={job.id}
                                                            job={job}
                                                            isSelected={
                                                                selectedJobId ===
                                                                    job.id ||
                                                                (index === 0 &&
                                                                    !selectedJobId)
                                                            }
                                                            isSaved={
                                                                !!savedJobs[
                                                                    job.id
                                                                ]
                                                            }
                                                            onSelect={() =>
                                                                setSelectedJobId(
                                                                    job.id,
                                                                )
                                                            }
                                                            onToggleSaved={() =>
                                                                toggleSavedJob(
                                                                    job.id,
                                                                )
                                                            }
                                                            testId={`card-agency-job-${job.id}`}
                                                        />
                                                    ),
                                                )
                                            ) : (
                                                <div className="rounded-md border border-[var(--line)] bg-white p-8 text-center shadow-sm">
                                                    <BriefcaseBusiness
                                                        className="mx-auto text-[var(--teal)]"
                                                        size={28}
                                                        aria-hidden="true"
                                                    />
                                                    <h3 className="mt-4 font-serif text-2xl font-bold text-[var(--navy)]">
                                                        No open roles right now.
                                                    </h3>
                                                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--slate)]">
                                                        Check back soon or
                                                        explore other verified
                                                        agencies on OPAP Job
                                                        Abroad.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <Pagination
                                            page={currentPage}
                                            totalPages={totalPages}
                                            label="Agency jobs pagination"
                                            testIdPrefix="jobs-page"
                                            onPageChange={changeJobPage}
                                        />
                                    </section>
                                </div>
                            )}

                            {activeTab === 'reviews' && (
                                <div
                                    id="panel-reviews"
                                    role="tabpanel"
                                    aria-labelledby="tab-reviews"
                                    tabIndex={0}
                                    className="mx-auto max-w-4xl outline-none"
                                >
                                    <section
                                        id="agency-reviews"
                                        className="mt-0"
                                        aria-labelledby="agency-reviews-title"
                                        data-testid="section-agency-reviews"
                                    >
                                        <div className="flex flex-wrap items-end justify-between gap-4">
                                            <div>
                                                <h2
                                                    id="agency-reviews-title"
                                                    className="font-serif text-3xl font-bold tracking-[-0.05em] text-[var(--navy)] sm:text-4xl"
                                                >
                                                    What candidates say.
                                                </h2>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <StarRating
                                                    rating={averageRating}
                                                />
                                                <span className="font-semibold text-[var(--navy)]">
                                                    {ratingDisplay} overall
                                                </span>
                                            </div>
                                        </div>
                                        <form
                                            className="mt-7 rounded-md border border-[var(--line)] bg-white p-6 shadow-sm sm:p-8"
                                            onSubmit={handleReviewSubmit}
                                            noValidate
                                        >
                                            <h3 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[var(--navy)]">
                                                Rate this agency
                                            </h3>
                                            <div
                                                className="mt-5 flex items-center gap-1"
                                                role="radiogroup"
                                                aria-label="Choose a rating from one to five stars"
                                                onMouseLeave={() =>
                                                    setHoverRating(0)
                                                }
                                            >
                                                {Array.from(
                                                    { length: 5 },
                                                    (_, index) => index + 1,
                                                ).map((star) => {
                                                    const activeRating =
                                                        hoverRating ||
                                                        selectedRating;

                                                    return (
                                                        <button
                                                            className="rounded-sm p-1 text-[var(--amber)] transition outline-none hover:scale-110 focus:ring-2 focus:ring-[var(--teal)]"
                                                            key={star}
                                                            type="button"
                                                            role="radio"
                                                            aria-checked={
                                                                selectedRating ===
                                                                star
                                                            }
                                                            aria-label={`${star} star${star === 1 ? '' : 's'}`}
                                                            data-testid={`star-rating-${star}`}
                                                            onClick={() => {
                                                                setSelectedRating(
                                                                    star,
                                                                );
                                                                setReviewError(
                                                                    '',
                                                                );
                                                                setReviewSuccess(
                                                                    '',
                                                                );
                                                            }}
                                                            onMouseEnter={() =>
                                                                setHoverRating(
                                                                    star,
                                                                )
                                                            }
                                                            onKeyDown={(
                                                                event,
                                                            ) => {
                                                                if (
                                                                    event.key ===
                                                                        'ArrowRight' ||
                                                                    event.key ===
                                                                        'ArrowUp'
                                                                ) {
                                                                    event.preventDefault();
                                                                    setSelectedRating(
                                                                        Math.min(
                                                                            5,
                                                                            star +
                                                                                1,
                                                                        ),
                                                                    );
                                                                }
                                                                if (
                                                                    event.key ===
                                                                        'ArrowLeft' ||
                                                                    event.key ===
                                                                        'ArrowDown'
                                                                ) {
                                                                    event.preventDefault();
                                                                    setSelectedRating(
                                                                        Math.max(
                                                                            1,
                                                                            star -
                                                                                1,
                                                                        ),
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <Star
                                                                size={26}
                                                                fill={
                                                                    star <=
                                                                    activeRating
                                                                        ? 'currentColor'
                                                                        : 'none'
                                                                }
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-6">
                                                <div>
                                                    <label
                                                        className={
                                                            reviewLabelClasses
                                                        }
                                                        htmlFor="review-comment"
                                                    >
                                                        Your experience
                                                    </label>
                                                    <textarea
                                                        className={`${reviewInputClasses} min-h-32 resize-y`}
                                                        id="review-comment"
                                                        value={reviewComment}
                                                        onChange={(event) => {
                                                            setReviewComment(
                                                                event.target
                                                                    .value,
                                                            );
                                                            setReviewError('');
                                                            setReviewSuccess(
                                                                '',
                                                            );
                                                        }}
                                                        placeholder="Share details of your experience with this agency..."
                                                        data-testid="textarea-review-comment"
                                                    />
                                                </div>
                                            </div>
                                            {(reviewError || reviewSuccess) && (
                                                <div
                                                    className={`mt-5 flex items-start gap-3 rounded-md border px-4 py-3 text-sm leading-6 ${
                                                        reviewError
                                                            ? 'border-[var(--amber)] bg-[var(--cream)] text-[var(--navy)]'
                                                            : 'border-[var(--teal)] bg-[var(--teal-light)] text-[var(--navy)]'
                                                    }`}
                                                    role="status"
                                                >
                                                    {reviewError ? (
                                                        <MessageSquare
                                                            className="mt-1 shrink-0"
                                                            size={16}
                                                            aria-hidden="true"
                                                        />
                                                    ) : (
                                                        <Check
                                                            className="mt-1 shrink-0"
                                                            size={16}
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                    <span
                                                        data-testid={
                                                            reviewSuccess
                                                                ? 'text-review-success'
                                                                : undefined
                                                        }
                                                    >
                                                        {reviewError ||
                                                            reviewSuccess}
                                                    </span>
                                                </div>
                                            )}
                                            <button
                                                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--amber)] px-5 text-sm font-bold text-[var(--ink)] transition outline-none hover:brightness-105 focus:ring-2 focus:ring-[var(--amber)] focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50"
                                                type="submit"
                                                disabled={!selectedRating}
                                                data-testid="button-submit-review"
                                            >
                                                Write a Review
                                            </button>
                                        </form>
                                        <div className="mt-7 space-y-4">
                                            {paginatedReviews.map((review) => (
                                                <article
                                                    className="rounded-md border border-[var(--line)] bg-white p-6 shadow-sm"
                                                    key={`${review.reviewer}-${review.date}`}
                                                >
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div>
                                                            <h3 className="font-semibold text-[var(--navy)]">
                                                                {
                                                                    review.reviewer
                                                                }
                                                            </h3>
                                                            <p className="mt-1 text-xs text-[var(--slate)]">
                                                                {review.date}
                                                            </p>
                                                        </div>
                                                        <StarRating
                                                            rating={
                                                                review.rating
                                                            }
                                                        />
                                                    </div>
                                                    <p className="mt-4 text-sm leading-7 text-[var(--slate)]">
                                                        {review.comment}
                                                    </p>
                                                </article>
                                            ))}
                                        </div>
                                        <Pagination
                                            page={currentReviewPage}
                                            totalPages={reviewTotalPages}
                                            label="Agency reviews pagination"
                                            testIdPrefix="reviews-page"
                                            onPageChange={changeReviewPage}
                                        />
                                    </section>
                                </div>
                            )}
                        </div>

                        <aside
                            className="hidden space-y-5 lg:sticky lg:top-[146px] lg:block"
                            aria-label="Agency quick facts"
                        >
                            <div
                                className="rounded-md border border-[var(--line)] bg-white p-6 shadow-sm"
                                data-testid="card-quick-facts"
                            >
                                <h2 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[var(--navy)]">
                                    Quick Facts
                                </h2>
                                <div className="mt-6 space-y-5">
                                    <div className="flex gap-3">
                                        <MapPin
                                            size={18}
                                            className="mt-1 shrink-0 text-[var(--teal)]"
                                            aria-hidden="true"
                                        />
                                        <div>
                                            <p className="font-mono text-[10px] font-bold tracking-[0.1em] text-[var(--slate)] uppercase">
                                                Headquarters
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-[var(--navy)]">
                                                {agency.location}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        {agency.pathway === 'landbased' ? (
                                            <Building2
                                                size={18}
                                                className="mt-1 shrink-0 text-[var(--teal)]"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <Ship
                                                size={18}
                                                className="mt-1 shrink-0 text-[var(--teal)]"
                                                aria-hidden="true"
                                            />
                                        )}
                                        <div>
                                            <p className="font-mono text-[10px] font-bold tracking-[0.1em] text-[var(--slate)] uppercase">
                                                Placement type
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-[var(--navy)]">
                                                {agency.pathway === 'landbased'
                                                    ? 'Landbased'
                                                    : 'Seabased'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <BadgeCheck
                                            size={18}
                                            className="mt-1 shrink-0 text-[var(--teal)]"
                                            aria-hidden="true"
                                        />
                                        <div>
                                            <p className="font-mono text-[10px] font-bold tracking-[0.1em] text-[var(--slate)] uppercase">
                                                DMW license
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-[var(--navy)]">
                                                {agency.license}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <BriefcaseBusiness
                                            size={18}
                                            className="mt-1 shrink-0 text-[var(--teal)]"
                                            aria-hidden="true"
                                        />
                                        <div>
                                            <p className="font-mono text-[10px] font-bold tracking-[0.1em] text-[var(--slate)] uppercase">
                                                Open jobs
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-[var(--navy)]">
                                                {agencyJobs.length} verified
                                                roles
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <UsersRound
                                            size={18}
                                            className="mt-1 shrink-0 text-[var(--teal)]"
                                            aria-hidden="true"
                                        />
                                        <div>
                                            <p className="font-mono text-[10px] font-bold tracking-[0.1em] text-[var(--slate)] uppercase">
                                                Agency size
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-[var(--navy)]">
                                                {agency.size ?? 'Not listed'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                className="rounded-md border border-[var(--line)] bg-white p-6 shadow-sm"
                                data-testid="card-rating-breakdown"
                            >
                                <h2 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[var(--navy)]">
                                    Rating breakdown
                                </h2>
                                <div className="mt-5 flex items-end gap-3">
                                    <span className="font-serif text-5xl leading-none font-bold text-[var(--navy)]">
                                        {ratingDisplay}
                                    </span>
                                    <div className="pb-1">
                                        <StarRating rating={averageRating} />
                                        <p className="mt-1 text-xs text-[var(--slate)]">
                                            {reviews.length} candidate reviews
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 space-y-2.5">
                                    {ratingBreakdown.map(
                                        ({ star, percentage }) => (
                                            <div
                                                className="flex items-center gap-2 text-xs text-[var(--slate)]"
                                                key={star}
                                            >
                                                <span className="w-3">
                                                    {star}
                                                </span>
                                                <Star
                                                    size={11}
                                                    fill="currentColor"
                                                    className="text-[var(--amber)]"
                                                    aria-hidden="true"
                                                />
                                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--teal-light)]">
                                                    <div
                                                        className="h-full rounded-full bg-[var(--teal)]"
                                                        style={{
                                                            width: `${percentage}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="w-8 text-right">
                                                    {percentage}%
                                                </span>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>

                            <div className="rounded-md border border-[var(--line)] bg-white p-6 shadow-sm">
                                <h2 className="font-serif text-2xl font-bold tracking-[-0.04em] text-[var(--navy)]">
                                    Follow / Contact
                                </h2>
                                <div className="mt-5 space-y-3 text-sm text-[var(--slate)]">
                                    <a
                                        className="flex items-center gap-3 outline-none hover:text-[var(--navy)] focus:ring-2 focus:ring-[var(--teal)]"
                                        href={`tel:${contact.phone}`}
                                    >
                                        <Phone
                                            size={16}
                                            className="text-[var(--teal)]"
                                            aria-hidden="true"
                                        />{' '}
                                        {contact.phone}
                                    </a>
                                    <a
                                        className="flex items-center gap-3 outline-none hover:text-[var(--navy)] focus:ring-2 focus:ring-[var(--teal)]"
                                        href={`mailto:${contact.email}`}
                                    >
                                        <Mail
                                            size={16}
                                            className="text-[var(--teal)]"
                                            aria-hidden="true"
                                        />{' '}
                                        <span className="break-all">
                                            {contact.email}
                                        </span>
                                    </a>
                                </div>
                                <SocialLinks social={agency.social} compact />
                            </div>

                            <div className="flex items-start gap-3 rounded-md border border-[var(--teal)] bg-[var(--teal-light)] p-5 text-xs leading-5 text-[var(--navy)]">
                                <Clock3
                                    size={16}
                                    className="mt-0.5 shrink-0 text-[var(--teal)]"
                                    aria-hidden="true"
                                />
                                <span>
                                    Confirm the offer, fees, and next steps
                                    directly with the agency before sending
                                    documents or making a payment.
                                </span>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </>
    );
}
