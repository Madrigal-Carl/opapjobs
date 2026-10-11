// MOCK DATA: replace with database/Inertia props later.
import { slugifyAgencyName } from '@/components/site/agency-card';
import type { Agency, AgencyReview, Pathway } from '@/types/agency';

export const DEFAULT_AGENCY_LOGO = '/agency-logo.svg';

function reviewsFor(
    firstReviewer: string,
    firstComment: string,
    secondReviewer: string,
    secondComment: string,
): AgencyReview[] {
    return [
        {
            reviewer: firstReviewer,
            rating: 5,
            date: 'August 2026',
            comment: firstComment,
        },
        {
            reviewer: secondReviewer,
            rating: 4,
            date: 'July 2026',
            comment: secondComment,
        },
        {
            reviewer: 'OPAP community member',
            rating: 5,
            date: 'June 2026',
            comment:
                'The listing details were clear, and the team explained the next steps before I submitted anything.',
        },
    ];
}

const socialFor = (site: string) => ({
    facebook: 'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/',
    x: 'https://x.com/',
    website: `https://${site}/`,
});

/**
 * The twelve agencies carried over verbatim from the OPAP design, including
 * contact details and review copy.
 */
const featuredAgencies: Agency[] = [
    {
        slug: 'staffhouse-international-resources',
        name: 'Staffhouse International Resources',
        location: 'Makati City',
        mark: 'SI',
        logo: DEFAULT_AGENCY_LOGO,
        jobs: 18,
        rating: '4.8',
        license: 'DMW License 101-LB-0425',
        pathway: 'landbased',
        description:
            'Staffhouse International Resources connects Filipino professionals and skilled workers with carefully screened employers across construction, facilities, hospitality, and technical services.',
        yearsInOperation: 25,
        size: 'Medium agency',
        contact: {
            phone: '+63 2 8812 3456',
            email: 'careers@staffhouse.com',
            address: 'Makati City, Metro Manila',
        },
        social: socialFor('staffhouse.com'),
        reviews: reviewsFor(
            'Rodelyn M.',
            'The application steps were explained clearly, especially the document checklist.',
            'Jomar P.',
            'I appreciated having one contact person who kept me updated about my interview.',
        ),
    },
    {
        slug: 'magsaysay-global-services',
        name: 'Magsaysay Global Services',
        location: 'Makati City',
        mark: 'MG',
        logo: DEFAULT_AGENCY_LOGO,
        jobs: 27,
        rating: '4.9',
        license: 'DMW License 102-LB-0771',
        pathway: 'landbased',
        topHirer: true,
        description:
            'Magsaysay Global Services supports candidates pursuing landbased roles with established employers, with a focus on transparent requirements and practical preparation.',
        yearsInOperation: 78,
        size: 'Large agency',
        contact: {
            phone: '+63 2 8840 6000',
            email: 'recruitment@magsaysay.com',
            address: 'Makati City, Metro Manila',
        },
        social: socialFor('magsaysay.com'),
        reviews: reviewsFor(
            'Leah C.',
            'Their orientation helped me understand the offer and what to prepare before departure.',
            'Nikko A.',
            'The team was responsive when I had questions about the employer and medical schedule.',
        ),
    },
    {
        slug: 'ipams',
        name: 'IPAMS',
        location: 'Quezon City',
        mark: 'IP',
        logo: DEFAULT_AGENCY_LOGO,
        jobs: 11,
        rating: '4.7',
        license: 'DMW License 103-LB-0118',
        pathway: 'landbased',
        description:
            'IPAMS provides recruitment support for Filipino candidates exploring professional, technical, and skilled opportunities with international employers.',
        yearsInOperation: 46,
        size: 'Large agency',
        contact: {
            phone: '+63 2 8722 0000',
            email: 'info@ipams.com',
            address: 'Quezon City, Metro Manila',
        },
        social: socialFor('ipams.com'),
        reviews: reviewsFor(
            'Ana R.',
            'I found the requirements easy to follow and received helpful reminders before my appointment.',
            'Mark T.',
            'The staff answered my questions about the role without rushing me into a decision.',
        ),
    },
    {
        slug: 'japex-workforce-solutions',
        name: 'JAPEX Workforce Solutions',
        location: 'Pasig City',
        mark: 'JW',
        logo: DEFAULT_AGENCY_LOGO,
        jobs: 42,
        rating: '4.8',
        license: 'DMW License 110-LB-0884',
        pathway: 'landbased',
        topHirer: true,
        description:
            'JAPEX Workforce Solutions helps match jobseekers with high-volume landbased opportunities while keeping role details, requirements, and next steps visible.',
        yearsInOperation: 18,
        size: 'Medium agency',
        contact: {
            phone: '+63 2 8632 1800',
            email: 'hello@japexworkforce.com',
            address: 'Pasig City, Metro Manila',
        },
        social: socialFor('japexworkforce.com'),
        reviews: reviewsFor(
            'Dina F.',
            'The recruiter shared the employer details and timeline before collecting my documents.',
            'Carlo V.',
            'A straightforward experience from screening through the interview schedule.',
        ),
    },
    {
        slug: 'global-staff-search',
        name: 'Global Staff Search',
        location: 'Makati City',
        mark: 'GS',
        logo: DEFAULT_AGENCY_LOGO,
        jobs: 36,
        rating: '4.7',
        license: 'DMW License 117-LB-0542',
        pathway: 'landbased',
        description:
            'Global Staff Search works with employers across multiple industries and gives candidates a practical path from initial screening to deployment.',
        yearsInOperation: 21,
        size: 'Medium agency',
        contact: {
            phone: '+63 2 8894 2100',
            email: 'apply@globalstaffsearch.com',
            address: 'Makati City, Metro Manila',
        },
        social: socialFor('globalstaffsearch.com'),
        reviews: reviewsFor(
            'Mylene G.',
            'The job description matched what was discussed during the call.',
            'Ralph B.',
            'I liked that the team gave me time to review the contract details.',
        ),
    },
    {
        slug: 'worklink-services',
        name: 'Worklink Services',
        location: 'Manila',
        mark: 'WS',
        logo: DEFAULT_AGENCY_LOGO,
        jobs: 29,
        rating: '4.8',
        license: 'DMW License 124-LB-0201',
        pathway: 'landbased',
        description:
            'Worklink Services supports Filipino jobseekers through verified landbased openings and hands-on guidance around documents, interviews, and deployment.',
        yearsInOperation: 16,
        size: 'Medium agency',
        contact: {
            phone: '+63 2 8733 4100',
            email: 'connect@worklinkservices.com',
            address: 'Manila, Metro Manila',
        },
        social: socialFor('worklinkservices.com'),
        reviews: reviewsFor(
            'Joy L.',
            'The team was patient with my questions and gave me a clear document checklist.',
            'Edwin S.',
            'The process felt organized, from the first screening to the employer interview.',
        ),
    },
    {
        slug: 'magsaysay-people-resources',
        name: 'Magsaysay People Resources',
        location: 'Manila',
        mark: 'MP',
        logo: DEFAULT_AGENCY_LOGO,
        jobs: 34,
        rating: '4.9',
        license: 'DMW License 201-SB-0332',
        pathway: 'seabased',
        topHirer: true,
        description:
            'Magsaysay People Resources supports Filipino seafarers with opportunities across international fleets and clear preparation for maritime deployment.',
        yearsInOperation: 78,
        size: 'Large agency',
        contact: {
            phone: '+63 2 8526 8888',
            email: 'seafarers@magsaysay.com',
            address: 'Manila, Metro Manila',
        },
        social: socialFor('magsaysay.com'),
        reviews: reviewsFor(
            'Dennis P.',
            'The pre-departure briefing made the onboard expectations much easier to understand.',
            'Maricel T.',
            'I received clear updates about my medical and travel documents.',
        ),
    },
    {
        slug: 'b-and-b-international',
        name: 'B and B International',
        location: 'Makati City',
        mark: 'BB',
        logo: DEFAULT_AGENCY_LOGO,
        jobs: 16,
        rating: '4.8',
        license: 'DMW License 202-SB-0640',
        pathway: 'seabased',
        description:
            'B and B International connects qualified maritime professionals with shipboard roles and practical support throughout the application process.',
        yearsInOperation: 31,
        size: 'Medium agency',
        contact: {
            phone: '+63 2 8892 1700',
            email: 'crew@bbinternational.com',
            address: 'Makati City, Metro Manila',
        },
        social: socialFor('bbinternational.com'),
        reviews: reviewsFor(
            'Joel D.',
            'The crewing team was direct about the vessel requirements and contract steps.',
            'Kristine O.',
            'My questions about certificates were answered before I scheduled the interview.',
        ),
    },
    {
        slug: 'united-philippine-lines',
        name: 'United Philippine Lines',
        location: 'Manila',
        mark: 'UP',
        logo: DEFAULT_AGENCY_LOGO,
        jobs: 9,
        rating: '4.6',
        license: 'DMW License 203-SB-0097',
        pathway: 'seabased',
        description:
            'United Philippine Lines helps maritime candidates find shipboard opportunities with straightforward crewing support and deployment guidance.',
        yearsInOperation: 37,
        size: 'Medium agency',
        contact: {
            phone: '+63 2 8527 9900',
            email: 'crewing@uplines.com',
            address: 'Manila, Metro Manila',
        },
        social: socialFor('uplines.com'),
        reviews: reviewsFor(
            'Arnel K.',
            'The office explained which certificates were needed before I applied.',
            'Liza M.',
            'I knew who to contact when I needed an update on my application.',
        ),
    },
    {
        slug: 'career-philippines-shipmanagement',
        name: 'Career Philippines Shipmanagement',
        location: 'Manila',
        mark: 'CP',
        logo: DEFAULT_AGENCY_LOGO,
        jobs: 38,
        rating: '4.9',
        license: 'DMW License 208-SB-0488',
        pathway: 'seabased',
        topHirer: true,
        description:
            'Career Philippines Shipmanagement offers maritime career pathways with international shipowners and a focus on reliable crewing operations.',
        yearsInOperation: 27,
        size: 'Large agency',
        contact: {
            phone: '+63 2 8527 7700',
            email: 'careers@careerphilippines.com',
            address: 'Manila, Metro Manila',
        },
        social: socialFor('careerphilippines.com'),
        reviews: reviewsFor(
            'Ramon J.',
            'The crewing staff gave me a clear timeline and checked my documents carefully.',
            'Sheila N.',
            'The briefing was useful and the role matched the details in the listing.',
        ),
    },
    {
        slug: 'maritime-placement-agency',
        name: 'Maritime Placement Agency',
        location: 'Pasay City',
        mark: 'MA',
        logo: DEFAULT_AGENCY_LOGO,
        jobs: 31,
        rating: '4.8',
        license: 'DMW License 214-SB-0627',
        pathway: 'seabased',
        description:
            'Maritime Placement Agency helps Filipino seafarers explore shipboard roles with clear requirements, interview preparation, and deployment support.',
        yearsInOperation: 23,
        size: 'Medium agency',
        contact: {
            phone: '+63 2 8851 3200',
            email: 'crew@maritimeplacement.com',
            address: 'Pasay City, Metro Manila',
        },
        social: socialFor('maritimeplacement.com'),
        reviews: reviewsFor(
            'Rico A.',
            'The staff walked me through the medical and certificate requirements.',
            'Mara E.',
            'The communication was consistent while I waited for the vessel assignment.',
        ),
    },
    {
        slug: 'seafarers-one-stop',
        name: 'Seafarers One Stop',
        location: 'Makati City',
        mark: 'SO',
        logo: DEFAULT_AGENCY_LOGO,
        jobs: 24,
        rating: '4.7',
        license: 'DMW License 220-SB-0163',
        pathway: 'seabased',
        description:
            'Seafarers One Stop gives maritime jobseekers one place to review crewing opportunities, prepare documents, and understand their next step.',
        yearsInOperation: 14,
        size: 'Small agency',
        contact: {
            phone: '+63 2 8817 4500',
            email: 'hello@seafarersone-stop.com',
            address: 'Makati City, Metro Manila',
        },
        social: socialFor('seafarersone-stop.com'),
        reviews: reviewsFor(
            'Paolo C.',
            'The team helped me organize my documents before I went to the interview.',
            'Nina V.',
            'The process was easy to follow and the job details were not vague.',
        ),
    },
];

const reviewPool: AgencyReview[] = [
    {
        reviewer: 'Rodelyn M.',
        rating: 5,
        date: 'August 2026',
        comment:
            'The document checklist was clear and nothing was left to guesswork.',
    },
    {
        reviewer: 'Jomar P.',
        rating: 4,
        date: 'July 2026',
        comment:
            'One contact person kept me updated from screening to interview.',
    },
    {
        reviewer: 'Leah C.',
        rating: 5,
        date: 'June 2026',
        comment:
            'Their orientation explained the offer and what to prepare before departure.',
    },
    {
        reviewer: 'Nikko A.',
        rating: 4,
        date: 'May 2026',
        comment:
            'The team answered my questions about the employer without rushing me.',
    },
    {
        reviewer: 'Ana R.',
        rating: 5,
        date: 'April 2026',
        comment:
            'The requirements were easy to follow and reminders arrived before my appointment.',
    },
    {
        reviewer: 'Mark T.',
        rating: 3,
        date: 'March 2026',
        comment:
            'A straightforward process overall, though the schedule shifted once.',
    },
    {
        reviewer: 'Dina F.',
        rating: 5,
        date: 'February 2026',
        comment:
            'The recruiter shared the employer details before collecting my documents.',
    },
    {
        reviewer: 'Carlo V.',
        rating: 4,
        date: 'January 2026',
        comment:
            'Screening through the interview schedule felt organized and clear.',
    },
    {
        reviewer: 'Mylene G.',
        rating: 4,
        date: 'December 2025',
        comment:
            'The job description matched what was discussed during the call.',
    },
    {
        reviewer: 'Ralph B.',
        rating: 5,
        date: 'November 2025',
        comment: 'I had time to review the contract details before deciding.',
    },
    {
        reviewer: 'Edwin S.',
        rating: 5,
        date: 'October 2025',
        comment:
            'The team was patient and gave me a clear next step at every stage.',
    },
    {
        reviewer: 'Mara E.',
        rating: 4,
        date: 'September 2025',
        comment:
            'Communication stayed consistent while I waited for my assignment.',
    },
];

function buildReviews(offset: number, count: number): AgencyReview[] {
    return Array.from({ length: count }, (_, index) => {
        return reviewPool[(offset + index) % reviewPool.length];
    });
}

type AgencySeed = {
    name: string;
    location: string;
    mark: string;
    jobs: number;
    rating: string;
    license: string;
    pathway: Pathway;
    yearsInOperation: number;
    size: string;
    description: string;
    website: string;
    reviewCount: number;
    topHirer?: boolean;
};

function buildAgency(seed: AgencySeed, index: number): Agency {
    const domain = `${seed.website}.example.com`;

    return {
        slug: slugifyAgencyName(seed.name),
        name: seed.name,
        location: seed.location,
        mark: seed.mark,
        logo: DEFAULT_AGENCY_LOGO,
        jobs: seed.jobs,
        rating: seed.rating,
        license: seed.license,
        pathway: seed.pathway,
        topHirer: seed.topHirer,
        description: seed.description,
        yearsInOperation: seed.yearsInOperation,
        size: seed.size,
        contact: {
            phone: `+63 2 8${String(300 + index).padStart(3, '0')} ${String(1000 + index * 7).slice(-4)}`,
            email: `careers@${domain}`,
            address: `${seed.location}, Metro Manila`,
        },
        social: socialFor(domain),
        reviews: buildReviews(index, seed.reviewCount),
    };
}

const additionalSeeds: AgencySeed[] = [
    {
        name: 'Pacific Workforce International',
        location: 'Cebu City',
        mark: 'PW',
        jobs: 22,
        rating: '4.6',
        license: 'DMW License 128-LB-0311',
        pathway: 'landbased',
        yearsInOperation: 12,
        size: 'Medium agency',
        description:
            'Pacific Workforce International places skilled Filipino workers with employers in construction, logistics, and service industries across the Middle East.',
        website: 'pacificworkforce',
        reviewCount: 3,
    },
    {
        name: 'Northgate Manpower Services',
        location: 'Quezon City',
        mark: 'NM',
        jobs: 15,
        rating: '4.5',
        license: 'DMW License 131-LB-0742',
        pathway: 'landbased',
        yearsInOperation: 9,
        size: 'Small agency',
        description:
            'Northgate Manpower Services supports candidates seeking technical and vocational roles with clear requirements and guided onboarding.',
        website: 'northgatemanpower',
        reviewCount: 4,
    },
    {
        name: 'Horizon Recruitment Partners',
        location: 'Davao City',
        mark: 'HR',
        jobs: 33,
        rating: '4.7',
        license: 'DMW License 136-LB-0195',
        pathway: 'landbased',
        yearsInOperation: 17,
        size: 'Medium agency',
        description:
            'Horizon Recruitment Partners connects professionals with hospitality, healthcare, and engineering openings while keeping every requirement transparent.',
        website: 'horizonrecruitment',
        reviewCount: 7,
    },
    {
        name: 'Asia Bridge Placement',
        location: 'Makati City',
        mark: 'AB',
        jobs: 9,
        rating: '4.4',
        license: 'DMW License 139-LB-0628',
        pathway: 'landbased',
        yearsInOperation: 6,
        size: 'Small agency',
        description:
            'Asia Bridge Placement helps Filipino jobseekers step into entry-level and skilled landbased roles with practical interview preparation.',
        website: 'asiabridge',
        reviewCount: 3,
    },
    {
        name: 'Summit Overseas Employment',
        location: 'Pasig City',
        mark: 'SM',
        jobs: 41,
        rating: '4.8',
        license: 'DMW License 142-LB-0833',
        pathway: 'landbased',
        yearsInOperation: 20,
        size: 'Large agency',
        topHirer: true,
        description:
            'Summit Overseas Employment manages high-volume landbased hiring with a focus on document readiness and reliable deployment timelines.',
        website: 'summitoverseas',
        reviewCount: 6,
    },
    {
        name: 'Bluepeak Staffing Solutions',
        location: 'Taguig City',
        mark: 'BP',
        jobs: 19,
        rating: '4.6',
        license: 'DMW License 145-LB-0274',
        pathway: 'landbased',
        yearsInOperation: 11,
        size: 'Medium agency',
        description:
            'Bluepeak Staffing Solutions recruits for facilities, retail, and industrial employers with a straightforward application process.',
        website: 'bluepeakstaffing',
        reviewCount: 4,
    },
    {
        name: 'Crownway Manpower Agency',
        location: 'Manila',
        mark: 'CW',
        jobs: 26,
        rating: '4.7',
        license: 'DMW License 148-LB-0519',
        pathway: 'landbased',
        yearsInOperation: 14,
        size: 'Medium agency',
        description:
            'Crownway Manpower Agency serves landbased candidates across trades and services with honest guidance on roles, pay, and fees.',
        website: 'crownway',
        reviewCount: 5,
    },
    {
        name: 'Eastwind Workforce Services',
        location: 'Cebu City',
        mark: 'EW',
        jobs: 12,
        rating: '4.5',
        license: 'DMW License 151-LB-0907',
        pathway: 'landbased',
        yearsInOperation: 8,
        size: 'Small agency',
        description:
            'Eastwind Workforce Services links skilled workers with verified landbased employers and supports them from screening to departure.',
        website: 'eastwindworkforce',
        reviewCount: 3,
    },
    {
        name: 'Metro Talent Placement',
        location: 'Mandaluyong City',
        mark: 'MT',
        jobs: 37,
        rating: '4.8',
        license: 'DMW License 154-LB-0338',
        pathway: 'landbased',
        yearsInOperation: 19,
        size: 'Large agency',
        description:
            'Metro Talent Placement matches applicants with construction, manufacturing, and service roles through a clear, step-by-step process.',
        website: 'metrotalent',
        reviewCount: 8,
    },
    {
        name: 'Prime Pacific Manpower',
        location: 'Makati City',
        mark: 'PP',
        jobs: 23,
        rating: '4.6',
        license: 'DMW License 157-LB-0781',
        pathway: 'landbased',
        yearsInOperation: 13,
        size: 'Medium agency',
        description:
            'Prime Pacific Manpower recruits for landbased employers with structured interviews and helpful pre-departure briefings.',
        website: 'primepacific',
        reviewCount: 4,
    },
    {
        name: 'Linkwest International Services',
        location: 'Quezon City',
        mark: 'LW',
        jobs: 14,
        rating: '4.4',
        license: 'DMW License 160-LB-0146',
        pathway: 'landbased',
        yearsInOperation: 7,
        size: 'Small agency',
        description:
            'Linkwest International Services guides candidates through landbased openings with attention to documents and timelines.',
        website: 'linkwest',
        reviewCount: 3,
    },
    {
        name: 'Aurora Global Staffing',
        location: 'Pasig City',
        mark: 'AG',
        jobs: 45,
        rating: '4.9',
        license: 'DMW License 163-LB-0952',
        pathway: 'landbased',
        yearsInOperation: 24,
        size: 'Large agency',
        description:
            'Aurora Global Staffing connects skilled and professional candidates with a broad range of landbased international opportunities.',
        website: 'auroraglobal',
        reviewCount: 9,
    },
    {
        name: 'Ocean Crew Management',
        location: 'Manila',
        mark: 'OC',
        jobs: 27,
        rating: '4.7',
        license: 'DMW License 224-SB-0185',
        pathway: 'seabased',
        yearsInOperation: 16,
        size: 'Medium agency',
        description:
            'Ocean Crew Management supports seafarers with crewing opportunities across cargo and tanker fleets, from application to embarkation.',
        website: 'oceancrew',
        reviewCount: 5,
    },
    {
        name: 'Bluewave Ship Manning',
        location: 'Pasay City',
        mark: 'BW',
        jobs: 20,
        rating: '4.6',
        license: 'DMW License 227-SB-0503',
        pathway: 'seabased',
        yearsInOperation: 12,
        size: 'Medium agency',
        description:
            'Bluewave Ship Manning helps maritime professionals find shipboard roles with clear certification guidance and steady communication.',
        website: 'bluewaveship',
        reviewCount: 4,
    },
    {
        name: 'Tidewater Marine Services',
        location: 'Makati City',
        mark: 'TW',
        jobs: 35,
        rating: '4.8',
        license: 'DMW License 230-SB-0729',
        pathway: 'seabased',
        yearsInOperation: 22,
        size: 'Large agency',
        topHirer: true,
        description:
            'Tidewater Marine Services crews international vessels and prepares seafarers with practical pre-departure briefings.',
        website: 'tidewatermarine',
        reviewCount: 12,
    },
    {
        name: 'Compass Maritime Agency',
        location: 'Manila',
        mark: 'CM',
        jobs: 13,
        rating: '4.5',
        license: 'DMW License 233-SB-0241',
        pathway: 'seabased',
        yearsInOperation: 8,
        size: 'Small agency',
        description:
            'Compass Maritime Agency connects qualified seafarers with shipboard positions while keeping contract terms clear.',
        website: 'compassmaritime',
        reviewCount: 3,
    },
    {
        name: 'Anchorpoint Crewing',
        location: 'Pasay City',
        mark: 'AP',
        jobs: 29,
        rating: '4.7',
        license: 'DMW License 236-SB-0866',
        pathway: 'seabased',
        yearsInOperation: 18,
        size: 'Medium agency',
        description:
            'Anchorpoint Crewing recruits deck and engine officers for international fleets with dependable crewing support.',
        website: 'anchorpoint',
        reviewCount: 6,
    },
    {
        name: 'Southern Star Manning',
        location: 'Cebu City',
        mark: 'SS',
        jobs: 18,
        rating: '4.6',
        license: 'DMW License 239-SB-0314',
        pathway: 'seabased',
        yearsInOperation: 10,
        size: 'Medium agency',
        description:
            'Southern Star Manning offers seafarers cruise and cargo opportunities with structured onboarding and travel support.',
        website: 'southernstar',
        reviewCount: 4,
    },
    {
        name: 'Global Marine Placement',
        location: 'Manila',
        mark: 'GM',
        jobs: 22,
        rating: '4.7',
        license: 'DMW License 242-SB-0597',
        pathway: 'seabased',
        yearsInOperation: 15,
        size: 'Medium agency',
        description:
            'Global Marine Placement helps maritime candidates review crewing openings and prepare documents before their interviews.',
        website: 'globalmarine',
        reviewCount: 5,
    },
    {
        name: 'Pacific Horizon Shipping',
        location: 'Makati City',
        mark: 'PH',
        jobs: 11,
        rating: '4.4',
        license: 'DMW License 245-SB-0078',
        pathway: 'seabased',
        yearsInOperation: 5,
        size: 'Small agency',
        description:
            'Pacific Horizon Shipping supports seafarers pursuing international routes with clear requirements and deployment guidance.',
        website: 'pacifichorizon',
        reviewCount: 3,
    },
    {
        name: 'Seagate Crewing Solutions',
        location: 'Manila',
        mark: 'SG',
        jobs: 31,
        rating: '4.8',
        license: 'DMW License 248-SB-0442',
        pathway: 'seabased',
        yearsInOperation: 20,
        size: 'Large agency',
        description:
            'Seagate Crewing Solutions matches experienced crew with international shipowners and keeps candidates updated at every step.',
        website: 'seagatecrewing',
        reviewCount: 7,
    },
    {
        name: 'Voyager Ship Management',
        location: 'Pasay City',
        mark: 'VM',
        jobs: 25,
        rating: '4.7',
        license: 'DMW License 251-SB-0819',
        pathway: 'seabased',
        yearsInOperation: 14,
        size: 'Medium agency',
        description:
            'Voyager Ship Management crews a range of vessels and guides seafarers through medical, visa, and certificate requirements.',
        website: 'voyagership',
        reviewCount: 4,
    },
    {
        name: 'Lighthouse Marine Staffing',
        location: 'Cebu City',
        mark: 'LH',
        jobs: 8,
        rating: '4.3',
        license: 'DMW License 254-SB-0263',
        pathway: 'seabased',
        yearsInOperation: 4,
        size: 'Small agency',
        description:
            'Lighthouse Marine Staffing helps entry-level and experienced seafarers find shipboard roles with honest, practical advice.',
        website: 'lighthousemarine',
        reviewCount: 3,
    },
];

export const agencies: Agency[] = [
    ...featuredAgencies,
    ...additionalSeeds.map(buildAgency),
];
