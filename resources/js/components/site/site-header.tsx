import { usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Bell,
    BriefcaseBusiness,
    Building2,
    ChevronDown,
    Clock3,
    Compass,
    FileText,
    Globe,
    Landmark,
    Menu,
    MessagesSquare,
    Ship,
    Star,
    X,
    Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Brand } from '@/components/site/brand';
import { SignedInMenu } from '@/components/site/signed-in-menu';

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
    const isHome = url === '/';
    const isAgencies = url === '/agencies' || url.startsWith('/agency/');
    const isJobs = url === '/jobs' || url.startsWith('/job/');
    const isContact = url === '/contact';
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
                            href="/#top"
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
                                    <a
                                        href="/jobs"
                                        role="menuitem"
                                        onClick={closeMenu}
                                    >
                                        <BriefcaseBusiness size={16} /> All Jobs{' '}
                                        <span>→</span>
                                    </a>
                                    <a
                                        href="/jobs?filter=landbased"
                                        role="menuitem"
                                        onClick={closeMenu}
                                    >
                                        <Building2 size={16} /> Landbased Jobs{' '}
                                        <span>→</span>
                                    </a>
                                    <a
                                        href="/jobs?filter=seabased"
                                        role="menuitem"
                                        onClick={closeMenu}
                                    >
                                        <Ship size={16} /> Seabased Jobs{' '}
                                        <span>→</span>
                                    </a>
                                    <a
                                        href="/jobs?filter=featured"
                                        role="menuitem"
                                        onClick={closeMenu}
                                    >
                                        <Star size={16} /> Featured Jobs{' '}
                                        <span>→</span>
                                    </a>
                                    <a
                                        href="/jobs?filter=urgent"
                                        role="menuitem"
                                        onClick={closeMenu}
                                    >
                                        <Zap size={16} /> Urgent Jobs{' '}
                                        <span>→</span>
                                    </a>
                                    <a
                                        href="/jobs?filter=recent"
                                        role="menuitem"
                                        onClick={closeMenu}
                                    >
                                        <Clock3 size={16} /> Recent Jobs{' '}
                                        <span>→</span>
                                    </a>
                                </div>
                            )}
                        </div>
                        <a
                            href="/agencies"
                            className={isAgencies ? 'nav-active' : undefined}
                            aria-current={isAgencies ? 'page' : undefined}
                            data-testid="link-nav-agencies"
                        >
                            Agencies
                        </a>
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
                                    <a
                                        href="/#resources"
                                        role="menuitem"
                                        onClick={closeMenu}
                                    >
                                        <FileText size={16} /> Resume Template{' '}
                                        <span>→</span>
                                    </a>
                                    <a
                                        href="/#resources"
                                        role="menuitem"
                                        onClick={closeMenu}
                                    >
                                        <Globe size={16} /> Online Resources{' '}
                                        <span>→</span>
                                    </a>
                                    <a
                                        href="/#resources"
                                        role="menuitem"
                                        onClick={closeMenu}
                                    >
                                        <Compass size={16} /> Career Tips{' '}
                                        <span>→</span>
                                    </a>
                                    <a
                                        href="/#resources"
                                        role="menuitem"
                                        onClick={closeMenu}
                                    >
                                        <MessagesSquare size={16} /> Interview
                                        Guide <span>→</span>
                                    </a>
                                    <a
                                        href="/#newsletter"
                                        role="menuitem"
                                        onClick={closeMenu}
                                    >
                                        <Bell size={16} /> Job Alerts{' '}
                                        <span>→</span>
                                    </a>
                                    <a
                                        href="/#resources"
                                        role="menuitem"
                                        onClick={closeMenu}
                                    >
                                        <Landmark size={16} /> Salary Guide{' '}
                                        <span>→</span>
                                    </a>
                                </div>
                            )}
                        </div>
                        <a
                            href="/contact"
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
                                        Dashboard
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
                            href="/#top"
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
                            href="/#top"
                            onClick={closeMobile}
                            data-testid="link-mobile-home"
                        >
                            Home <ArrowRight size={18} />
                        </a>
                        <a
                            href="/agencies"
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
                                <a href="/jobs" onClick={closeMobile}>
                                    All Jobs
                                </a>
                                <a
                                    href="/jobs?filter=landbased"
                                    onClick={closeMobile}
                                >
                                    Landbased Jobs
                                </a>
                                <a
                                    href="/jobs?filter=seabased"
                                    onClick={closeMobile}
                                >
                                    Seabased Jobs
                                </a>
                                <a
                                    href="/jobs?filter=featured"
                                    onClick={closeMobile}
                                >
                                    Featured Jobs
                                </a>
                                <a
                                    href="/jobs?filter=urgent"
                                    onClick={closeMobile}
                                >
                                    Urgent Jobs
                                </a>
                                <a
                                    href="/jobs?filter=recent"
                                    onClick={closeMobile}
                                >
                                    Recent Jobs
                                </a>
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
                                <a href="/#resources" onClick={closeMobile}>
                                    Resume Template
                                </a>
                                <a href="/#resources" onClick={closeMobile}>
                                    Online Resources
                                </a>
                                <a href="/#resources" onClick={closeMobile}>
                                    Career Tips
                                </a>
                                <a href="/#resources" onClick={closeMobile}>
                                    Interview Guide
                                </a>
                                <a href="/#newsletter" onClick={closeMobile}>
                                    Job Alerts
                                </a>
                                <a href="/#resources" onClick={closeMobile}>
                                    Salary Guide
                                </a>
                            </div>
                        )}
                        <a
                            href="/contact"
                            onClick={closeMobile}
                            data-testid="link-mobile-contact"
                        >
                            Contact Us <ArrowRight size={18} />
                        </a>
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
