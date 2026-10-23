import { useSyncExternalStore } from 'react';
import {
    seedApplicantCertifications,
    seedApplicantDocuments,
    seedApplicantEducation,
    seedApplicantExperiences,
    seedApplicantProfiles,
    seedApplicantSkills,
} from './seeds/applicants';
import {
    seedApplicationAnswers,
    seedApplications,
    seedStageHistory,
} from './seeds/applications';
import { seedCategories, seedSubcategories } from './seeds/categories';
import { seedAgencies, seedReviews } from './seeds/agencies';
import { seedAccounts } from './seeds/accounts';
import { seedJobPostQuestions, seedJobPosts } from './seeds/job-posts';
import { seedAudit } from './seeds/audit';
import {
    seedContent,
    seedCustomFields,
    seedFormFields,
    seedOptionLists,
    seedSettings,
} from './seeds/config';
import type {
    AgencyRecord,
    AgencyReviewRecord,
    ApplicantCertificationRecord,
    ApplicantDocumentRecord,
    ApplicantEducationRecord,
    ApplicantExperienceRecord,
    ApplicantProfileRecord,
    ApplicantSkillRecord,
    ApplicationAnswerRecord,
    ApplicationRecord,
    ApplicationStageHistoryRecord,
    AuditChange,
    AuditEntry,
    AuditSubjectType,
    CustomFieldRecord,
    FormFieldRecord,
    JobCategoryRecord,
    JobPostQuestionRecord,
    JobPostRecord,
    JobSubcategoryRecord,
    OptionListState,
    SettingsState,
    SiteContentState,
    UserRecord,
} from './types';

/**
 * The whole Super Admin console reads and writes one in-memory store.
 *
 * There is no backend: a mutation replaces the state object and notifies
 * subscribers, so every open screen updates at once and edits survive an
 * Inertia visit inside the session. A browser refresh resets everything,
 * which Settings exposes as "Reset demo data".
 *
 * Everything that changes also writes an `AuditEntry`, so the audit log is
 * never a dead screen (spec §4.11).
 */

export type SystemState = {
    agencies: AgencyRecord[];
    accounts: UserRecord[];
    jobPosts: JobPostRecord[];
    jobPostQuestions: JobPostQuestionRecord[];
    applications: ApplicationRecord[];
    stageHistory: ApplicationStageHistoryRecord[];
    applicationAnswers: ApplicationAnswerRecord[];
    applicantProfiles: ApplicantProfileRecord[];
    applicantExperiences: ApplicantExperienceRecord[];
    applicantEducation: ApplicantEducationRecord[];
    applicantCertifications: ApplicantCertificationRecord[];
    applicantSkills: ApplicantSkillRecord[];
    applicantDocuments: ApplicantDocumentRecord[];
    reviews: AgencyReviewRecord[];
    categories: JobCategoryRecord[];
    subcategories: JobSubcategoryRecord[];
    optionLists: OptionListState;
    formFields: FormFieldRecord[];
    customFields: CustomFieldRecord[];
    content: SiteContentState;
    settings: SettingsState;
    audit: AuditEntry[];
    /** Monotonic id source so new rows never collide with the seeds. */
    nextId: number;
};

function createInitialState(): SystemState {
    return {
        agencies: seedAgencies(),
        accounts: seedAccounts(),
        jobPosts: seedJobPosts(),
        jobPostQuestions: seedJobPostQuestions(),
        applications: seedApplications(),
        stageHistory: seedStageHistory(),
        applicationAnswers: seedApplicationAnswers(),
        applicantProfiles: seedApplicantProfiles(),
        applicantExperiences: seedApplicantExperiences(),
        applicantEducation: seedApplicantEducation(),
        applicantCertifications: seedApplicantCertifications(),
        applicantSkills: seedApplicantSkills(),
        applicantDocuments: seedApplicantDocuments(),
        reviews: seedReviews(),
        categories: seedCategories(),
        subcategories: seedSubcategories(),
        optionLists: seedOptionLists(),
        formFields: seedFormFields(),
        customFields: seedCustomFields(),
        content: seedContent(),
        settings: seedSettings(),
        audit: seedAudit(),
        nextId: 10_000,
    };
}

let state: SystemState = createInitialState();

const listeners = new Set<() => void>();

function emit(): void {
    for (const listener of listeners) {
        listener();
    }
}

/** Internal store subscription; `useSystemState` is the React binding. */
export function subscribeSystem(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function getSystemState(): SystemState {
    return state;
}

/**
 * Replaces the state and notifies every subscriber. Always call this rather
 * than mutating a record in place: components render from the object
 * identity, so a shared reference would not repaint.
 */
export function updateSystemState(
    updater: (current: SystemState) => SystemState,
): void {
    state = updater(state);
    emit();
}

/**
 * The whole state object. It is referentially stable between mutations, so
 * this is safe to hand to `useSyncExternalStore`; derive collections with
 * `useMemo` inside the component instead of selecting per render, which
 * would build a fresh snapshot every time and loop.
 */
export function useSystemState(): SystemState {
    return useSyncExternalStore(
        subscribeSystem,
        getSystemState,
        getSystemState,
    );
}

/** Allocates the next free id and advances the counter. */
export function nextSystemId(current: SystemState = state): number {
    return current.nextId;
}

export function bumpSystemId(current: SystemState): SystemState {
    return { ...current, nextId: current.nextId + 1 };
}

/**
 * Applies a change and writes its audit entry in the same update, so the
 * log can never miss a mutation. Returns the audit id so a caller can build
 * an "Undo" that commits the inverse.
 */
export function commitSystemChange(options: {
    action: string;
    subjectType: AuditSubjectType;
    subjectId: number | string;
    subjectLabel: string;
    changes: AuditChange[];
    apply: (current: SystemState) => SystemState;
}): string {
    const auditId = `audit-${state.nextId}`;
    const actorUserId =
        state.accounts.find((a) => a.role === 'superadmin')?.id ?? 1;
    const entry: AuditEntry = {
        id: auditId,
        createdAt: new Date().toISOString(),
        actorUserId,
        action: options.action,
        subjectType: options.subjectType,
        subjectId: options.subjectId,
        subjectLabel: options.subjectLabel,
        changes: options.changes,
        ipAddress: '127.0.0.1',
    };

    updateSystemState((current) => {
        const next = options.apply(current);

        return { ...next, audit: [entry, ...next.audit] };
    });

    return auditId;
}

/** Drops the newest audit row, used when an "Undo" reverts its change. */
export function popAuditEntry(): void {
    updateSystemState((current) => ({
        ...current,
        audit: current.audit.slice(1),
    }));
}

/** Puts the console back to its seeded state. */
export function resetSystemDemoData(): void {
    state = createInitialState();
    emit();
}
