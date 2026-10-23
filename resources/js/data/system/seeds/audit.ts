import type { AuditEntry } from '../types';

/**
 * The audit log is seeded so the screen is meaningful before anyone edits
 * anything; every later change appends through `commitSystemChange`.
 *
 * Timestamps are spread backwards so the date filter has more than one day
 * to work with.
 */
export function seedAudit(): AuditEntry[] {
    return [
        {
            id: 'audit-seed-4',
            createdAt: '2026-10-19T08:12:00.000Z',
            actorUserId: 1,
            action: 'verify',
            subjectType: 'agency',
            subjectId: 1,
            subjectLabel: 'Staffhouse International Resources',
            changes: [{ field: 'Verified', from: false, to: true }],
            ipAddress: '127.0.0.1',
        },
        {
            id: 'audit-seed-3',
            createdAt: '2026-10-17T14:40:00.000Z',
            actorUserId: 1,
            action: 'suspend',
            subjectType: 'agency',
            subjectId: 3,
            subjectLabel: 'Oceanic Marine Placements',
            changes: [{ field: 'Suspended', from: false, to: true }],
            ipAddress: '127.0.0.1',
        },
        {
            id: 'audit-seed-2',
            createdAt: '2026-10-15T11:05:00.000Z',
            actorUserId: 1,
            action: 'update',
            subjectType: 'settings',
            subjectId: 1,
            subjectLabel: 'Platform settings',
            changes: [{ field: 'Default staff seat limit', from: 4, to: 5 }],
            ipAddress: '127.0.0.1',
        },
        {
            id: 'audit-seed-1',
            createdAt: '2026-10-12T09:30:00.000Z',
            actorUserId: 1,
            action: 'archive',
            subjectType: 'job_post',
            subjectId: 5,
            subjectLabel: 'Carpenter — Riyadh, Saudi Arabia',
            changes: [{ field: 'Status', from: 'Closed', to: 'Archived' }],
            ipAddress: '127.0.0.1',
        },
    ];
}
