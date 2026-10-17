import type { ApplicationActivity } from '@/types/application-draft';

/**
 * Where a first-time visitor starts on My Jobs. Everything here is mock and
 * is replaced the moment the applicant's own activity is persisted.
 */
export const demoApplicationActivity: ApplicationActivity = {
    applied: ['sea-1'],
    saved: ['land-2', 'land-1'],
    archived: [],
};
