import { agencies } from '@/data/agencies';
import type { Agency } from '@/types/agency';

/**
 * The agency behind a listing. Jobs store the agency by name, so the join
 * happens here rather than duplicating agency records inside the job list.
 */
export function findAgency(name: string): Agency | undefined {
    return agencies.find((agency) => agency.name === name);
}
