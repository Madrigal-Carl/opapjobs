import type { AgencyRecord, AgencyReviewRecord } from '../types';

/**
 * Agencies and reviews.
 *
 * Agency names, cities, DMW licences and contact blocks are carried over
 * from `data/agencies.ts`; the record shape is `docs/database.md` §7.2.
 *
 * Deliberate spread so every rule in §1 is visible somewhere in the data:
 * - Agency 1: landbased, verified, 14 job posts (so its pathway is locked),
 *   staff seats already at the limit used by the seat-check example.
 * - Agency 2: landbased, unverified, spare seats.
 * - Agency 3: seabased, suspended (job posts hidden, staff cannot sign in).
 * - Agency 4: archived, kept so Restore has something to act on.
 */

const BASE = '2026-06-01T09:00:00.000Z';

function agency(
    id: number,
    agencyName: string,
    slug: string,
    pathway: AgencyRecord['pathway'],
    dmwLicenseNumber: string,
    headquartersCity: string,
    overrides: Partial<AgencyRecord> = {},
): AgencyRecord {
    return {
        id,
        slug,
        agencyName,
        pathway,
        dmwLicenseNumber,
        agencySize: 'Medium agency',
        headquartersCity,
        about: null,
        logoPath: '/agency-logo.svg',
        yearEstablished: null,
        publicPhone: null,
        publicEmail: null,
        publicAddress: null,
        facebookUrl: null,
        instagramUrl: null,
        xUrl: null,
        websiteUrl: null,
        verifiedAt: null,
        agencyUserLimit: 5,
        adminUserId: null,
        suspendedAt: null,
        createdByUserId: 1,
        deletedAt: null,
        createdAt: BASE,
        ...overrides,
    };
}

export function seedAgencies(): AgencyRecord[] {
    return [
        agency(
            1,
            'Staffhouse International Resources',
            'staffhouse-international-resources',
            'landbased',
            '101-LB-0425',
            'Makati City',
            {
                about: 'Staffhouse International Resources connects Filipino professionals and skilled workers with carefully screened employers across construction, facilities, hospitality, and technical services.',
                yearEstablished: 2001,
                agencySize: 'Medium agency',
                publicPhone: '+63 2 8812 3456',
                publicEmail: 'careers@staffhouse.com',
                publicAddress: 'Makati City, Metro Manila',
                facebookUrl: 'https://www.facebook.com/',
                instagramUrl: 'https://www.instagram.com/',
                xUrl: 'https://x.com/',
                websiteUrl: 'https://staffhouse.com/',
                verifiedAt: '2026-06-15T10:00:00.000Z',
                agencyUserLimit: 5,
                adminUserId: 2,
            },
        ),
        agency(
            2,
            'Magsaysay Global Services',
            'magsaysay-global-services',
            'landbased',
            '102-LB-0771',
            'Makati City',
            {
                about: 'Magsaysay Global Services supports candidates pursuing landbased roles with established employers, with a focus on transparent requirements and practical preparation.',
                yearEstablished: 1948,
                agencySize: 'Large agency',
                publicPhone: '+63 2 8840 6000',
                publicEmail: 'recruitment@magsaysay.com',
                publicAddress: 'Makati City, Metro Manila',
                websiteUrl: 'https://magsaysay.com/',
                agencyUserLimit: 8,
                adminUserId: 6,
            },
        ),
        agency(
            3,
            'Oceanic Marine Placements',
            'oceanic-marine-placements',
            'seabased',
            '201-SB-0119',
            'Cebu City',
            {
                about: 'Crew placement for deck, engine and catering departments on cargo and cruise vessels.',
                yearEstablished: 2012,
                agencySize: 'Small agency',
                publicPhone: '+63 32 255 7788',
                publicEmail: 'crew@oceanicmarine.ph',
                publicAddress: 'Cebu City',
                websiteUrl: 'https://oceanicmarine.ph/',
                suspendedAt: '2026-10-05T03:00:00.000Z',
                agencyUserLimit: 4,
                adminUserId: 9,
            },
        ),
        agency(
            4,
            'Northstar Technical Staffing',
            'northstar-technical-staffing',
            'landbased',
            '105-LB-0902',
            'Pasig City',
            {
                agencySize: 'Small agency',
                deletedAt: '2026-08-14T02:00:00.000Z',
                agencyUserLimit: 3,
                adminUserId: 11,
            },
        ),
    ];
}

/**
 * One review per applicant per Agency (§7.4). Reviewer names and copy are
 * carried over from `data/agencies.ts`.
 */
export function seedReviews(): AgencyReviewRecord[] {
    const base = '2026-08-01T09:00:00.000Z';

    return [
        {
            id: 1,
            agencyId: 1,
            applicantUserId: 12,
            rating: 5,
            reviewText:
                'The application steps were explained clearly, especially the document checklist.',
            editedByModeratorAt: null,
            deletedAt: null,
            createdAt: base,
        },
        {
            id: 2,
            agencyId: 1,
            applicantUserId: 13,
            rating: 4,
            reviewText:
                'I appreciated having one contact person who kept me updated about my interview.',
            editedByModeratorAt: null,
            deletedAt: null,
            createdAt: '2026-08-05T09:00:00.000Z',
        },
        {
            id: 3,
            agencyId: 1,
            applicantUserId: 14,
            rating: 3,
            reviewText:
                'Slow to respond after the medical, but everything was eventually sorted.',
            editedByModeratorAt: '2026-09-11T09:00:00.000Z',
            deletedAt: null,
            createdAt: '2026-08-09T09:00:00.000Z',
        },
        {
            id: 4,
            agencyId: 2,
            applicantUserId: 16,
            rating: 5,
            reviewText: null,
            editedByModeratorAt: null,
            deletedAt: null,
            createdAt: '2026-08-12T09:00:00.000Z',
        },
        {
            id: 5,
            agencyId: 2,
            applicantUserId: 15,
            rating: 2,
            reviewText:
                'Withdrew my review after the agency resolved the misunderstanding.',
            editedByModeratorAt: null,
            deletedAt: '2026-09-22T09:00:00.000Z',
            createdAt: '2026-08-15T09:00:00.000Z',
        },
    ];
}
