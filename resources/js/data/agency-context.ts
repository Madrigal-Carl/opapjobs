import type { Pathway } from '@/types/agency';

export type AgencyContext = {
    name: string;
    pathway: Pathway;
};

/**
 * The agency the signed-in user belongs to. An agency posts for a
 * single pathway, so this drives the category lists, the form and the
 * dashboard filters instead of a per-job choice.
 *
 * MOCK DATA: replace with the authenticated user's agency once the
 * backend sends it.
 */
const agencies: Record<Pathway, AgencyContext> = {
    landbased: {
        name: 'Staffhouse International Resources',
        pathway: 'landbased',
    },
    seabased: {
        name: 'Seafarers One Stop',
        pathway: 'seabased',
    },
};

let currentPathway: Pathway = 'landbased';

export function getAgencyPathway(): Pathway {
    return currentPathway;
}

export function getAgencyContext(): AgencyContext {
    return agencies[currentPathway];
}

export const PATHWAY_LABELS: Record<Pathway, string> = {
    landbased: 'Landbased',
    seabased: 'Seabased',
};
