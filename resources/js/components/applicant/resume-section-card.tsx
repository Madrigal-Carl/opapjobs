import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type ResumeNavItem = {
    id: string;
    label: string;
    icon: LucideIcon;
    count?: number;
};

function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
    });
    window.history.replaceState(null, '', `#${id}`);
}

/**
 * Section navigation for the resume page.
 *
 * - `vertical`: the sticky "On this resume" rail shown on desktop.
 * - `horizontal`: the scrollable chip row shown on small screens.
 */
export function ResumePageNav({
    items,
    orientation = 'vertical',
    className,
}: {
    items: ResumeNavItem[];
    orientation?: 'vertical' | 'horizontal';
    className?: string;
}) {
    if (orientation === 'horizontal') {
        return (
            <nav
                aria-label="Resume sections"
                className={className}
                data-testid="nav-resume-mobile"
            >
                <ul className="resume-nav-scroll">
                    {items.map((item) => (
                        <li key={item.id}>
                            <a
                                href={`#${item.id}`}
                                onClick={(event) => {
                                    event.preventDefault();
                                    scrollToSection(item.id);
                                }}
                                className="resume-nav-chip"
                                data-testid={`link-resume-nav-mobile-${item.id}`}
                            >
                                <item.icon size={13} aria-hidden="true" />
                                {item.label}
                                {typeof item.count === 'number' &&
                                    item.count > 0 && (
                                        <span className="resume-nav-count">
                                            {item.count}
                                        </span>
                                    )}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        );
    }

    return (
        <nav
            aria-label="Resume sections"
            className={className}
            data-testid="nav-resume-desktop"
        >
            <p className="resume-nav-heading">On this resume</p>
            <ul className="grid gap-1">
                {items.map((item) => (
                    <li key={item.id}>
                        <a
                            href={`#${item.id}`}
                            onClick={(event) => {
                                event.preventDefault();
                                scrollToSection(item.id);
                            }}
                            className="resume-nav-link"
                            data-testid={`link-resume-nav-${item.id}`}
                        >
                            <item.icon size={15} aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate">
                                {item.label}
                            </span>
                            {typeof item.count === 'number' && (
                                <span className="resume-nav-count">
                                    {item.count}
                                </span>
                            )}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

/** The frame every editable resume section shares. */
export function ResumeSectionCard({
    id,
    eyebrow,
    title,
    count,
    icon: Icon,
    action,
    children,
    testId,
}: {
    id: string;
    eyebrow: string;
    title: string;
    count?: string;
    icon?: LucideIcon;
    action: ReactNode;
    children: ReactNode;
    testId: string;
}) {
    return (
        <section id={id} className="resume-card" data-testid={testId}>
            <header className="resume-card-header">
                <div className="flex min-w-0 items-center gap-3">
                    {Icon && (
                        <span className="resume-card-icon" aria-hidden="true">
                            <Icon size={17} />
                        </span>
                    )}
                    <div className="min-w-0">
                        <p className="resume-eyebrow">{eyebrow}</p>
                        <div className="mt-0.5 flex items-baseline gap-2">
                            <h2 className="truncate font-serif text-lg font-bold text-[var(--navy)]">
                                {title}
                            </h2>
                            {count && (
                                <span className="resume-card-count">
                                    {count}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    {action}
                </div>
            </header>
            <div className="px-5 py-5">{children}</div>
        </section>
    );
}
