import type { Pathway } from './agency';

export type Job = {
    id: string;
    title: string;
    employer: string;
    pathway: Pathway;
    location: string;
    salary: string;
    posted: string;
    featured?: boolean;
    urgent?: boolean;
    recent?: boolean;
};
