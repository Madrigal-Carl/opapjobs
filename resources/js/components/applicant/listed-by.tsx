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
import type { Agency } from '@/types/agency';
import type { Job } from '@/types/job';

/** The named person an agency nominated for this specific listing. */
type ListingContact = Pick<
    Job,
    'contactName' | 'contactEmail' | 'contactPhone'
>;

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
    agency: Agency;
    contact?: ListingContact;
}) {
    const rating = Number(agency.rating);
    const hasContact = Boolean(
        contact?.contactName || contact?.contactEmail || contact?.contactPhone,
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
                                <StarRating
                                    rating={rating}
                                    testId="rating-listed-by"
                                />
                                <strong>{rating.toFixed(1)}</strong>
                            </span>
                            <span className="job-listed-by-verified">
                                <BadgeCheck size={15} aria-hidden="true" />{' '}
                                Verified agency
                            </span>
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
                        {contact?.contactName && (
                            <li>
                                <User size={14} aria-hidden="true" />
                                {contact.contactName}
                            </li>
                        )}
                        {contact?.contactEmail && (
                            <li>
                                <Mail size={14} aria-hidden="true" />
                                <a
                                    href={`mailto:${contact.contactEmail}`}
                                    data-testid="link-job-contact-email"
                                >
                                    {contact.contactEmail}
                                </a>
                            </li>
                        )}
                        {contact?.contactPhone && (
                            <li>
                                <Phone size={14} aria-hidden="true" />
                                <a
                                    href={`tel:${contact.contactPhone.replaceAll(
                                        ' ',
                                        '',
                                    )}`}
                                    data-testid="link-job-contact-phone"
                                >
                                    {contact.contactPhone}
                                </a>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </section>
    );
}
