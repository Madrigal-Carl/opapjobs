import {
    ArrowRight,
    BadgeCheck,
    Building2,
    MapPin,
    Ship,
    Sparkles,
    Star,
} from 'lucide-react';
import { AppLogo } from '@/components/site/app-logo';
import { show as agencyShow } from '@/routes/agencies';
import type { Agency } from '@/types/agency';

export function slugifyAgencyName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

type AgencyCardProps = {
    agency: Agency;
    testId: string;
    linkHref?: string;
    linkLabel?: string;
};

export function AgencyCard({
    agency,
    testId,
    linkHref = agencyShow.url(agency.slug),
    linkLabel = 'View agency',
}: AgencyCardProps) {
    const PathwayIcon = agency.pathway === 'landbased' ? Building2 : Ship;

    return (
        <article className="agency-card" data-testid={testId}>
            <div className="agency-card-top">
                <div className="agency-card-identity">
                    <AppLogo className="agency-logo" />
                    <div>
                        <h3>{agency.name}</h3>
                        <div className="agency-location">
                            <MapPin size={14} aria-hidden="true" />{' '}
                            {agency.location}
                        </div>
                    </div>
                </div>
                <div className="agency-card-pills">
                    {agency.topHirer && (
                        <span className="top-hirer-pill">
                            <Sparkles size={12} aria-hidden="true" /> Top Hirer
                        </span>
                    )}
                    <span className="verified-pill">
                        <BadgeCheck size={13} aria-hidden="true" /> Verified
                    </span>
                </div>
            </div>
            <div className="agency-license">
                <BadgeCheck size={14} aria-hidden="true" /> {agency.license}
            </div>
            <div className="agency-card-tags">
                <span className="agency-pathway-tag">
                    <PathwayIcon size={13} aria-hidden="true" />{' '}
                    {agency.pathway === 'landbased' ? 'Landbased' : 'Seabased'}
                </span>
                {agency.topHirer && (
                    <span className="actively-hiring-tag">Actively hiring</span>
                )}
            </div>
            <div className="agency-card-divider" />
            <div className="agency-card-foot">
                <span className="agency-rating">
                    <Star size={13} fill="currentColor" aria-hidden="true" />{' '}
                    {agency.rating}
                </span>
                <span className="agency-open-jobs">
                    {agency.jobs} open jobs
                </span>
                <a
                    href={linkHref}
                    data-testid={`link-agency-jobs-${agency.mark}`}
                >
                    {linkLabel} <ArrowRight size={15} aria-hidden="true" />
                </a>
            </div>
        </article>
    );
}
