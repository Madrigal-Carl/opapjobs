import type { Pathway } from './agency';

export type Availability =
    | 'Available now'
    | 'Available in 2 weeks'
    | 'Available in 1 month';

export type Applicant = {
    id: number;
    name: string;
    initials: string;
    role: string;
    pathway: Pathway;
    location: string;
    experience: string;
    skills: string[];
    availability: Availability;
};
