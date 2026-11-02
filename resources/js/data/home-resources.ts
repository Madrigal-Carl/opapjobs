import { Compass, FileCheck2, Landmark, type LucideIcon } from 'lucide-react';

/** Static editorial cards on the landing page (copy, not database data). */
export type HomeResource = {
    icon: LucideIcon;
    eyebrow: string;
    title: string;
    body: string;
    href: string;
};

export const homeResources: HomeResource[] = [
    {
        icon: FileCheck2,
        eyebrow: 'BEFORE YOU APPLY',
        title: 'How to spot a verified job offer',
        body: 'The five checks every overseas applicant should make before sending documents or paying a fee.',
        href: '#resources',
    },
    {
        icon: Landmark,
        eyebrow: 'KNOW YOUR RIGHTS',
        title: 'Your DMW placement fee guide',
        body: 'Understand what agencies can charge, what employers cover, and when to walk away.',
        href: '#resources',
    },
    {
        icon: Compass,
        eyebrow: 'PLAN THE MOVE',
        title: 'Your first 30 days abroad',
        body: 'A practical checklist for contracts, arrival, remittance, and staying connected to home.',
        href: '#resources',
    },
];
