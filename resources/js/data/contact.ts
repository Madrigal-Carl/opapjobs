import type { LucideIcon } from 'lucide-react';
import {
    BadgeCheck,
    FileQuestion,
    Landmark,
    Mail,
    MapPin,
    Phone,
    ShieldCheck,
} from 'lucide-react';

/**
 * Who to contact, and about what.
 *
 * Three real desks rather than one inbox, so an application about a posting
 * does not have to be triaged by whoever reads the mail first.
 */
export const CONTACT_DESKS: {
    id: string;
    label: string;
    email: string;
    phone: string;
    icon: LucideIcon;
    blurb: string;
}[] = [
    {
        id: 'applications',
        label: 'An application you sent',
        email: 'applications@opapjobs.ph',
        phone: '+63 2 8123 4567',
        icon: Mail,
        blurb: 'Reference the job title and the agency name. Applications are handled by the agency that posted the role, so this desk can only see what was sent through the platform.',
    },
    {
        id: 'verification',
        label: 'An agency or employer listing',
        email: 'verification@opapjobs.ph',
        phone: '+63 2 8123 4570',
        icon: ShieldCheck,
        blurb: 'Accreditation documents, licence numbers, and listings that look wrong on this site. Include the URL so we can find the record.',
    },
    {
        id: 'support',
        label: 'Your account or your resume',
        email: 'support@opapjobs.ph',
        phone: '+63 2 8123 4560',
        icon: BadgeCheck,
        blurb: 'Signing in, the resume on your profile, saved jobs, and anything that looks wrong on the site.',
    },
];

/**
 * The questions that come up most, answered in the open.
 *
 * Written to be read rather than searched, and ordered by how often they
 * block someone from applying.
 */
export const CONTACT_FAQS: { id: string; question: string; answer: string }[] =
    [
        {
            id: 'manpooling',
            question: 'Why does this job not name a company?',
            answer: 'It is a manpooling vacancy. The hiring company has not authorised its name to be published, so the listing shows the destination country instead and you are placed through the DMW-accredited agency that posted it. You apply to the agency, not the employer.',
        },
        {
            id: 'fees',
            question: 'Does OPAP charge a fee?',
            answer: 'No. We do not charge applicants to browse, save, or apply. Some private recruiters do, and a fee is never required to be considered for a job posted here. Report any agency that asks for one before you pay.',
        },
        {
            id: 'after-applying',
            question: 'What happens after I apply?',
            answer: 'The agency reviews your application against its own criteria. Statuses here change when the agency moves you forward. There is no fixed timeline — some agencies reply within days, others only when they shortlist for a specific role.',
        },
        {
            id: 'documents',
            question: 'Which documents should I upload?',
            answer: 'A PDF of your resume, plus any certificate the listing names by hand — safety training, trade licences, medical certificates. Keep them in the Documents section of your resume and you can send the same file with every application.',
        },
        {
            id: 'verification',
            question: 'How do I know an agency is real?',
            answer: 'Every listing here comes from an agency that has supplied its accreditation. Open the agency profile from the job page to see its licence number, specialties, and the reviews applicants left. A listing that names no agency, or asks for money, is not one of ours.',
        },
        {
            id: 'data',
            question: 'Who can see my resume?',
            answer: 'Accredited agencies you apply to. Employers who are not a posting agency cannot browse it. You can turn agency visibility off on your resume page at any time.',
        },
    ];

/** The published details shown in the footer and on this page. */
export const CONTACT_DETAILS = {
    office: 'OPAP Job Abroad — Overseas Manpower Advisory Office',
    address: 'Taft Avenue, Malate, Manila, Philippines 1000',
    hours: 'Monday to Friday, 9:00 AM – 5:00 PM PHT',
    email: 'hello@opapjobs.ph',
    phone: '+63 2 8123 4500',
    emergency: '+63 917 555 0199',
} as const;

export const CONTACT_ICONS = {
    address: MapPin,
    email: Mail,
    phone: Phone,
    hours: Landmark,
    faq: FileQuestion,
} satisfies Record<string, LucideIcon>;
