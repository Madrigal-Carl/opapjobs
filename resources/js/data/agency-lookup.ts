// MOCK DATA: the agency a listing belongs to is stored on the job by name,
// so the join lives here rather than duplicating agency records.
import { agencies } from '@/data/agencies';
import type { Agency } from '@/types/agency';

export function findAgency(name: string): Agency | undefined {
    return agencies.find((agency) => agency.name === name);
}
