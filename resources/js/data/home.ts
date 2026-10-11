import { Compass, FileCheck2, Landmark, type LucideIcon } from 'lucide-react';
import { agencies } from '@/data/agencies';
import { jobs } from '@/data/jobs';
import type { Agency, Pathway } from '@/types/agency';
import type { Job } from '@/types/job';

const topHirerNames: Record<Pathway, string[]> = {
    landbased: [
        'JAPEX Workforce Solutions',
        'Global Staff Search',
        'Worklink Services',
    ],
    seabased: [
        'Career Philippines Shipmanagement',
        'Maritime Placement Agency',
        'Seafarers One Stop',
    ],
};

const asTopHirer = (name: string): Agency => {
    const agency = agencies.find((candidate) => candidate.name === name);

    if (!agency) {
        throw new Error(`Unknown top hirer: ${name}`);
    }

    return { ...agency, topHirer: true };
};

export const homeAgencies: Record<Pathway, Agency[]> = {
    landbased: agencies
        .filter((agency) => agency.pathway === 'landbased')
        .slice(0, 3),
    seabased: agencies
        .filter((agency) => agency.pathway === 'seabased')
        .slice(0, 3),
};

export const homeTopHirers: Record<Pathway, Agency[]> = {
    landbased: topHirerNames.landbased.map(asTopHirer),
    seabased: topHirerNames.seabased.map(asTopHirer),
};

export const homeJobs: Record<Pathway, Job[]> = {
    landbased: jobs.filter((job) => job.pathway === 'landbased'),
    seabased: jobs.filter((job) => job.pathway === 'seabased'),
};

export const homeStats = {
    agencies: { landbased: '54 agencies', seabased: '32 agencies' },
    topHirers: { landbased: '24 top hirers', seabased: '17 top hirers' },
} satisfies Record<string, Record<Pathway, string>>;

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
