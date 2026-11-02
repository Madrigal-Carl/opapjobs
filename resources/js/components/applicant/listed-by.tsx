import {
    ArrowRight,
    BadgeCheck,
    Mail,
    Phone,
    User,
    UsersRound,
} from 'lucide-react';
import { AppLogo } from '@/components/site/app-logo';
import { StarRating } from '@/components/site/star-rating';
import { show as agencyShow } from '@/routes/agencies';
import type {
    PublicAgencyListedBy,
    PublicJobPostDetail,
} from '@/types/public-catalog';

/** The named person an agency nominated for this specific job post. */
type JobPostContact = PublicJobPostDetail['contact'];

/**
 * Who posted this listing.
 *
 * The three figures under the description are the ones that decide whether
 * an applicant can trust the posting — licence number, how long the agency
 * has been operating, and its size — so they sit on the listing rather than
 * behind a link.
 *
 * The per-listing contact is the one thing the agency profile cannot show,
 * so it sits at the foot of the same band instead of in a competing card.
 */
export function ListedBy({
    agency,
    contact,
}: {
    agency: PublicAgencyListedBy;
    contact?: JobPostContact;
}) {
    const hasContact = Boolean(
        contact?.name || contact?.email || contact?.phone,
    );

    return (
        <section
            className="job-listed-by"
            aria-labelledby="job-listed-by-title"
            data-testid="section-job-listed-by"
        >
            <div className="job-listed-by-head">
                <div className="job-listed-by-identity">
                    <AppLogo className="job-listed-by-logo" tone="navy" />
                    <div className="job-listed-by-name">
                        <p className="job-listed-by-eyebrow">Listed by</p>
                        <h2 id="job-listed-by-title">
                            <a
                                href={agencyShow.url(agency.slug)}
                                data-testid="link-listed-by-agency"
                            >
                                {agency.name}
                            </a>
                        </h2>
                        <div className="job-listed-by-trust">
                            <span className="job-listed-by-rating">
                                {agency.rating === null ? (
                                    <strong data-testid="rating-listed-by">
                                        No reviews yet
                                    </strong>
                                ) : (
                                    <>
                                        <StarRating
                                            rating={agency.rating}
                                            testId="rating-listed-by"
                                        />
                                        <strong>
                                            {agency.rating.toFixed(1)}
                                        </strong>
                                        <span>
                                            ({agency.reviewCount}{' '}
                                            {agency.reviewCount === 1
                                                ? 'review'
                                                : 'reviews'}
                                            )
                                        </span>
                                    </>
                                )}
                            </span>
                            {agency.verified && (
                                <span className="job-listed-by-verified">
                                    <BadgeCheck size={15} aria-hidden="true" />{' '}
                                    Verified agency
                                </span>
                            )}
                            {agency.topHirer && (
                                <span className="top-hirer-pill">
                                    Top Hirer · {agency.hiredCount} hired
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <a
                    className="job-listed-by-link"
                    href={agencyShow.url(agency.slug)}
                    data-testid="link-listed-by-view-profile"
                >
                    View agency profile
                    <ArrowRight size={16} aria-hidden="true" />
                </a>
            </div>

            {agency.description && (
                <p className="job-listed-by-description">
                    {agency.description}
                </p>
            )}

            <dl className="job-listed-by-stats">
                <div>
                    <dt>DMW licence</dt>
                    <dd>{agency.license}</dd>
                </div>
                <div>
                    <dt>Years in operation</dt>
                    <dd>
                        {agency.yearsInOperation
                            ? `${agency.yearsInOperation} years`
                            : 'Not published'}
                    </dd>
                </div>
                <div>
                    <dt>Agency size</dt>
                    <dd>
                        <UsersRound size={16} aria-hidden="true" />
                        {agency.size ?? 'Accredited recruitment agency'}
                    </dd>
                </div>
            </dl>

            {hasContact && (
                <div
                    className="job-listed-by-ask"
                    data-testid="job-listed-by-contact"
                >
                    <p className="job-listed-by-ask-label">
                        Ask about this role
                    </p>
                    <ul className="job-listed-by-ask-links">
                        {contact?.name && (
                            <li>
                                <User size={14} aria-hidden="true" />
                                {contact.name}
                            </li>
                        )}
                        {contact?.email && (
                            <li>
                                <Mail size={14} aria-hidden="true" />
                                <a
                                    href={`mailto:${contact.email}`}
                                    data-testid="link-job-contact-email"
                                >
                                    {contact.email}
                                </a>
                            </li>
                        )}
                        {contact?.phone && (
                            <li>
                                <Phone size={14} aria-hidden="true" />
                                <a
                                    href={`tel:${contact.phone.replaceAll(
                                        ' ',
                                        '',
                                    )}`}
                                    data-testid="link-job-contact-phone"
                                >
                                    {contact.phone}
                                </a>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </section>
    );
}
