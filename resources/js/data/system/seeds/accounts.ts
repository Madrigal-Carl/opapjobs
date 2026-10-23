import type { UserRecord } from '../types';

/**
 * Accounts seeded from the existing `data/accounts.ts` staff names, plus
 * the roles the docs require: one superadmin, one admin per Agency and
 * self-registered applicants (§2.1).
 *
 * Ids are stable and small so other seeds can point at them.
 */

const BASE = '2026-09-01T09:00:00.000Z';

function user(
    id: number,
    name: string,
    email: string,
    role: UserRecord['role'],
    agencyId: number | null,
    overrides: Partial<UserRecord> = {},
): UserRecord {
    return {
        id,
        name,
        email,
        emailVerifiedAt: BASE,
        role,
        agencyId,
        createdByUserId: role === 'superadmin' ? null : 1,
        suspendedAt: null,
        lastActiveAt: BASE,
        deletedAt: null,
        createdAt: BASE,
        ...overrides,
    };
}

export function seedAccounts(): UserRecord[] {
    return [
        user(
            1,
            'Platform Owner',
            'superadmin@example.test',
            'superadmin',
            null,
        ),

        // Agency 1 — Staffhouse International Resources (landbased)
        user(2, 'Liza Mercado', 'liza.mercado@opapjobs.ph', 'admin', 1),
        user(3, 'Joyce Rampon', 'joyce.rampon@opapjobs.ph', 'agency', 1),
        user(4, 'Andrew Tan', 'andrew.tan@opapjobs.ph', 'agency', 1),
        user(5, 'Paula Ibarra', 'paula.ibarra@opapjobs.ph', 'agency', 1, {
            suspendedAt: '2026-10-02T08:30:00.000Z',
        }),

        // Agency 2 — Magsaysay Global Services (landbased)
        user(6, 'Jose Panganiban', 'jose.panganiban@opapjobs.ph', 'admin', 2),
        user(7, 'Carmen Delgado', 'carmen.delgado@opapjobs.ph', 'agency', 2),
        user(8, 'Teresa Espiritu', 'teresa.espiritu@opapjobs.ph', 'agency', 2),

        // Agency 3 — Oceanic Marine Placements (seabased)
        user(9, 'Rafael Cruz', 'rafael.cruz@opapjobs.ph', 'admin', 3),
        user(10, 'Marco Dimaala', 'marco.dimaala@opapjobs.ph', 'agency', 3),

        // Agency 4 — Northstar Technical staffing (landbased, archived)
        user(
            11,
            'Nicolas Villegas',
            'nicolas.villegas@opapjobs.ph',
            'admin',
            4,
            {
                deletedAt: '2026-08-14T02:00:00.000Z',
            },
        ),

        // Applicants
        user(
            12,
            'Christian Ocampo',
            'christian.ocampo@example.test',
            'applicant',
            null,
            {
                lastActiveAt: '2026-10-18T11:20:00.000Z',
            },
        ),
        user(
            13,
            'Maribel Santos',
            'maribel.santos@example.test',
            'applicant',
            null,
            {
                lastActiveAt: '2026-10-19T07:45:00.000Z',
            },
        ),
        user(
            14,
            'Jomar Padilla',
            'jomar.padilla@example.test',
            'applicant',
            null,
        ),
        user(
            15,
            'Analyn Reyes',
            'analyn.reyes@example.test',
            'applicant',
            null,
            {
                deletedAt: '2026-09-20T04:10:00.000Z',
            },
        ),
        user(
            16,
            'Rodel Manalo',
            'rodel.manalo@example.test',
            'applicant',
            null,
            {
                lastActiveAt: '2026-10-20T15:02:00.000Z',
            },
        ),
        user(
            17,
            'Grace Villanueva',
            'grace.villanueva@example.test',
            'applicant',
            null,
        ),
    ];
}
