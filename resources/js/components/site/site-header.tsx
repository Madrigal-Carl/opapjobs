import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BriefcaseBusiness,
    Building2,
    ChevronDown,
    Clock3,
    Compass,
    FileText,
    Globe,
    Menu,
    Ship,
    Star,
    X,
    Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Brand } from '@/components/site/brand';
import { SignedInMenu } from '@/components/site/signed-in-menu';
import { applications, contact, home, resume } from '@/routes';
import { index as agenciesIndex } from '@/routes/agencies';
import { index as jobsIndex } from '@/routes/jobs';

const HOME_ANCHOR = `${home.url()}#top`;
const RESOURCES_ANCHOR = `${home.url()}#resources`;

/**
 * Resources menu. "Resume Template" is a real applicant page; the rest deep
 * link into the field guide on the home page.
 */
const resourceLinks = [
    { label: 'Resume Template', icon: FileText, href: resume.url() },
    { label: 'Online Resources', icon: Globe, href: RESOURCES_ANCHOR },
    { label: 'Career Tips', icon: Compass, href: RESOURCES_ANCHOR },
    { label: 'Interview Guide', icon: Star, href: RESOURCES_ANCHOR },
    { label: 'Salary Guide', icon: Building2, href: RESOURCES_ANCHOR },
];

const jobLinks = [
    { label: 'All Jobs', icon: BriefcaseBusiness, href: jobsIndex.url() },
    {
        label: 'Landbased Jobs',
        icon: Building2,
        href: jobsIndex.url({ query: { filter: 'landbased' } }),
    },
    {
        label: 'Seabased Jobs',
        icon: Ship,
        href: jobsIndex.url({ query: { filter: 'seabased' } }),
    },
    {
        label: 'Urgent Jobs',
        icon: Zap,
        href: jobsIndex.url({ query: { filter: 'urgent' } }),
    },
    {
        label: 'Recent Jobs',
        icon: Clock3,
        href: jobsIndex.url({ query: { filter: 'recent' } }),
    },
];

export function SiteHeader() {
    const { url, props } = usePage();
    const user = props.auth.user;
    const canAccessDashboard =
        props.auth.permissions?.includes('access dashboard') ?? false;
    const [isScrolled, setIsScrolled] = useState(false);
    const [openMenu, setOpenMenu] = useState<
        'jobs' | 'resources' | 'avatar' | null
    >(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobileGroup, setMobileGroup] = useState<string | null>(null);
    // Match on the path alone so a query string (filters, page) or hash
    // keeps the section highlighted: `/jobs?filter=urgent` is still Jobs.
    const path = url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
    const isUnder = (prefix: string) =>
        path === prefix || path.startsWith(`${prefix}/`);
    const isHome = path === '/';
    const isAgencies = isUnder('/agencies') || isUnder('/agency');
    const isJobs = isUnder('/jobs') || isUnder('/job');
    const isMyJobs = isUnder('/applications') || isUnder('/resume');
    const isContact = isUnder('/contact');
    const showScrolledHeader = isScrolled || isContact;

    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 14);
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpenMenu(null);
                setMobileOpen(false);
            }
        };
        const onPointerDown = (event: PointerEvent) => {
            if (
                event.target instanceof Element &&
                !event.target.closest('.nav-dropdown-wrap')
            ) {
                setOpenMenu(null);
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('keydown', onKeyDown);
        document.addEventListener('pointerdown', onPointerDown);

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, []);

    const closeMobile = () => {
        setMobileOpen(false);
        setMobileGroup(null);
    };

    const closeMenu = () => setOpenMenu(null);
    const toggleNavMenu = (menu: 'jobs' | 'resources') => {
        setOpenMenu((current) => (current === menu ? null : menu));
    };

    return (
        <>
            <header
                className={`site-header ${showScrolledHeader ? 'site-header-scrolled' : ''}`}
            >
                <div className="shell nav-inner">
                    <Brand />
                    <nav className="desktop-nav" aria-label="Main navigation">
                        <a
                            href={HOME_ANCHOR}
                            className={isHome ? 'nav-active' : undefined}
                            aria-current={isHome ? 'page' : undefined}
                            data-testid="link-nav-home"
                        >
                            Home
                        </a>
                        <div className="nav-dropdown-wrap">
                            <button
                                type="button"
                                className={`nav-link-button ${
                                    openMenu === 'jobs' ? 'is-open' : ''
                                } ${isJobs ? 'nav-active' : ''}`}
                                onClick={() => toggleNavMenu('jobs')}
                                aria-expanded={openMenu === 'jobs'}
                                data-testid="button-dropdown-jobs"
                            >
                                Jobs{' '}
                                <ChevronDown size={15} aria-hidden="true" />
                            </button>
                            {openMenu === 'jobs' && (
                                <div
                                    className="nav-dropdown"
                                    role="menu"
                                    data-testid="menu-jobs"
                                >
                                    {jobLinks.map(
                                        ({ label, icon: Icon, href }) => (
                                            <Link
                                                key={label}
                                                href={href}
                                                role="menuitem"
                                                onClick={closeMenu}
                                                data-testid={`link-nav-${label
                                                    .toLowerCase()
                                                    .replaceAll(' ', '-')}`}
                                            >
                                                <Icon
                                                    size={16}
                                                    aria-hidden="true"
                                                />
                                                {label} <span>→</span>
                                            </Link>
                                        ),
                                    )}
                                </div>
                            )}
                        </div>
                        <a
                            href={agenciesIndex.url()}
                            className={isAgencies ? 'nav-active' : undefined}
                            aria-current={isAgencies ? 'page' : undefined}
                            data-testid="link-nav-agencies"
                        >
                            Agencies
                        </a>
                        {user && (
                            <a
                                href={applications.url()}
                                className={isMyJobs ? 'nav-active' : undefined}
                                aria-current={isMyJobs ? 'page' : undefined}
                                data-testid="link-nav-my-jobs"
                            >
                                My Jobs
                            </a>
                        )}
                        <div className="nav-dropdown-wrap">
                            <button
                                type="button"
                                className={`nav-link-button ${
                                    openMenu === 'resources' ? 'is-open' : ''
                                }`}
                                onClick={() => toggleNavMenu('resources')}
                                aria-expanded={openMenu === 'resources'}
                                data-testid="button-dropdown-resources"
                            >
                                Resources{' '}
                                <ChevronDown size={15} aria-hidden="true" />
                            </button>
                            {openMenu === 'resources' && (
                                <div
                                    className="nav-dropdown nav-dropdown-resources"
                                    role="menu"
                                    data-testid="menu-resources"
                                >
                                    <div className="dropdown-heading">
                                        THE OPAP FIELD GUIDE
                                    </div>
                                    {resourceLinks.map(
                                        ({ label, icon: Icon, href }) => (
                                            <a
                                                key={label}
                                                href={href}
                                                role="menuitem"
                                                onClick={closeMenu}
                                                data-testid={`link-nav-${label
                                                    .toLowerCase()
                                                    .replaceAll(' ', '-')}`}
                                            >
                                                <Icon
                                                    size={16}
                                                    aria-hidden="true"
                                                />
                                                {label} <span>→</span>
                                            </a>
                                        ),
                                    )}
                                </div>
                            )}
                        </div>
                        <a
                            href={contact.url()}
                            className={isContact ? 'nav-active' : undefined}
                            aria-current={isContact ? 'page' : undefined}
                            data-testid="link-nav-contact"
                        >
                            Contact Us
                        </a>
                    </nav>
                    <div className="nav-actions">
                        {user ? (
                            <>
                                {canAccessDashboard && (
                                    <a
                                        className="nav-signin"
                                        href="/dashboard/overview"
                                        data-testid="link-dashboard"
                                    >
                                        Overview
                                    </a>
                                )}
                                <SignedInMenu
                                    open={openMenu === 'avatar'}
                                    onToggle={() =>
                                        setOpenMenu((current) =>
                                            current === 'avatar'
                                                ? null
                                                : 'avatar',
                                        )
                                    }
                                />
                            </>
                        ) : (
                            <>
                                <a
                                    className="nav-signin"
                                    href="/login"
                                    data-testid="link-sign-in"
                                >
                                    Sign in
                                </a>
                                <a
                                    className="nav-cta"
                                    href="/register"
                                    data-testid="link-nav-cta"
                                >
                                    Get Started{' '}
                                    <ArrowRight size={16} aria-hidden="true" />
                                </a>
                            </>
                        )}
                    </div>
                    <div className="mobile-header-actions">
                        <SignedInMenu
                            compact
                            open={openMenu === 'avatar'}
                            onToggle={() =>
                                setOpenMenu((current) =>
                                    current === 'avatar' ? null : 'avatar',
                                )
                            }
                        />
                        <button
                            className="mobile-menu-button"
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            aria-label="Open navigation menu"
                            data-testid="button-mobile-menu"
                        >
                            <Menu size={23} />
                        </button>
                    </div>
                </div>
            </header>

            {mobileOpen && (
                <div
                    className="mobile-drawer"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Mobile navigation"
                    data-testid="mobile-drawer"
                >
                    <div className="mobile-drawer-top">
                        <Brand
                            href={HOME_ANCHOR}
                            testId="link-mobile-brand"
                            onClick={closeMobile}
                        />
                        <button
                            className="drawer-close"
                            type="button"
                            onClick={closeMobile}
                            aria-label="Close navigation menu"
                            data-testid="button-close-mobile-menu"
                        >
                            <X size={22} />
                        </button>
                    </div>
                    <div className="mobile-nav-groups">
                        <a
                            href={HOME_ANCHOR}
                            onClick={closeMobile}
                            data-testid="link-mobile-home"
                        >
                            Home <ArrowRight size={18} />
                        </a>
                        <a
                            href={agenciesIndex.url()}
                            onClick={closeMobile}
                            data-testid="link-mobile-agencies"
                        >
                            Agencies <ArrowRight size={18} />
                        </a>
                        <button
                            type="button"
                            onClick={() =>
                                setMobileGroup(
                                    mobileGroup === 'jobs' ? null : 'jobs',
                                )
                            }
                            aria-expanded={mobileGroup === 'jobs'}
                            data-testid="button-mobile-jobs"
                        >
                            Jobs <ChevronDown size={18} />
                        </button>
                        {mobileGroup === 'jobs' && (
                            <div className="mobile-subgroup">
                                {jobLinks.map(({ label, href }) => (
                                    <Link
                                        key={label}
                                        href={href}
                                        onClick={closeMobile}
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() =>
                                setMobileGroup(
                                    mobileGroup === 'resources'
                                        ? null
                                        : 'resources',
                                )
                            }
                            aria-expanded={mobileGroup === 'resources'}
                            data-testid="button-mobile-resources"
                        >
                            Resources <ChevronDown size={18} />
                        </button>
                        {mobileGroup === 'resources' && (
                            <div className="mobile-subgroup">
                                {resourceLinks.map(({ label, href }) => (
                                    <a
                                        key={label}
                                        href={href}
                                        onClick={closeMobile}
                                    >
                                        {label}
                                    </a>
                                ))}
                            </div>
                        )}
                        <a
                            href={contact.url()}
                            onClick={closeMobile}
                            data-testid="link-mobile-contact"
                        >
                            Contact Us <ArrowRight size={18} />
                        </a>
                        {user && (
                            <a
                                href={applications.url()}
                                onClick={closeMobile}
                                data-testid="link-mobile-my-jobs"
                            >
                                My Jobs <ArrowRight size={18} />
                            </a>
                        )}
                    </div>
                    {!user && (
                        <div className="mobile-drawer-bottom">
                            <a href="/login" onClick={closeMobile}>
                                Sign In
                            </a>
                            <a
                                className="nav-cta"
                                href="/register"
                                onClick={closeMobile}
                            >
                                Get Started <ArrowRight size={16} />
                            </a>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
