import { Globe } from 'lucide-react';
import type { MouseEventHandler } from 'react';

type BrandProps = {
    /** Extra classes on the anchor (e.g. `brand-footer` in the footer). */
    className?: string;
    href?: string;
    testId?: string;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function Brand({
    className,
    href = '/#top',
    testId = 'link-brand',
    onClick,
}: BrandProps) {
    return (
        <a
            className={className ? `brand ${className}` : 'brand'}
            href={href}
            aria-label="OPAP Job Abroad home"
            data-testid={testId}
            onClick={onClick}
        >
            <Globe
                className="brand-globe"
                size={25}
                strokeWidth={1.8}
                aria-hidden="true"
            />
            <span className="brand-name">OPAP Job Abroad</span>
        </a>
    );
}
