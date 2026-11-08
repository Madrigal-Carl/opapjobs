import { Circle, CircleCheck } from 'lucide-react';
import { focusApplyField } from '@/components/applicant/apply-field';
import { ApplyRailRow } from '@/components/applicant/match-blocks';
import type { ApplicationDraftRecord } from '@/data/application-draft-store';
import { countLabel } from '@/data/applicant-profile';
import {
    missingRequiredAnswers,
    type ApplicationStep,
} from '@/types/application-draft';
import type { Job, JobQuestion } from '@/types/job';

export function ApplyChecklist({
    job,
    step,
    draft,
    questions,
}: {
    job: Job;
    step: ApplicationStep;
    draft: ApplicationDraftRecord;
    questions: JobQuestion[];
}) {
    const required = questions.filter((question) => question.required);
    const missing = missingRequiredAnswers(required, draft.answers);
    const hasResume = Boolean(draft.resumeId || draft.uploadedResume?.name);
    const done = required.length - missing.length + Number(hasResume);
    const total = required.length + 1;
    const optional = questions.filter((question) => !question.required);
    const extras = [
        draft.coverLetter,
        draft.salary,
        draft.availability,
        ...optional.map((question) => draft.answers[question.id]),
    ].filter((value) =>
        typeof value === 'string'
            ? Boolean(value.trim())
            : Boolean(value?.length),
    ).length;
    const items = [
        {
            label: 'Resume',
            detail: hasResume ? 'Selected' : 'Choose a file',
            done: hasResume,
            target: 'apply-resume',
        },
        {
            label: 'Required questions',
            detail: `${required.length - missing.length}/${required.length} answered`,
            done: missing.length === 0,
            target:
                required.length > 0
                    ? `question-${missing[0]?.id ?? required[0].id}`
                    : 'apply-resume',
        },
        {
            label: 'Optional extras',
            detail: `${extras} added`,
            done: extras > 0,
            target: 'apply-optional',
        },
    ];

    return (
        <aside
            className="apply-rail"
            aria-label="Application checklist"
            data-testid="apply-checklist"
        >
            <div className="apply-rail-card apply-checklist-card">
                <div className="apply-checklist-heading">
                    <h2>Application checklist</h2>
                    <span>
                        {done}/{total}
                    </span>
                </div>
                <progress
                    className="apply-progress"
                    value={done}
                    max={total}
                    aria-label="Required application items completed"
                />
                <p className="apply-checklist-summary" role="status">
                    {done === total
                        ? 'Ready to review'
                        : `${total - done} required left`}
                    <span> · Saved automatically</span>
                </p>
                <ul className="apply-checklist-items">
                    {items.map((item) => {
                        const Icon = item.done ? CircleCheck : Circle;
                        const content = (
                            <>
                                <Icon size={18} aria-hidden="true" />
                                <span>
                                    <strong>{item.label}</strong>
                                    <span>{item.detail}</span>
                                </span>
                            </>
                        );
                        return (
                            <li
                                key={item.label}
                                className={item.done ? 'is-complete' : ''}
                            >
                                {step === 2 ? (
                                    <a
                                        href={`#${item.target}`}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            focusApplyField(item.target);
                                        }}
                                        data-testid={`link-apply-checklist-${item.label.toLowerCase().replaceAll(' ', '-')}`}
                                    >
                                        {content}
                                    </a>
                                ) : (
                                    <div>{content}</div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
            <div className="apply-rail-card apply-job-facts">
                <p className="apply-rail-title">The role at a glance</p>
                <ApplyRailRow label="Agency" value={job.agency} />
                <ApplyRailRow
                    label="Slots"
                    value={countLabel(job.quantity, 'position')}
                />
                <ApplyRailRow label="Advertised pay" value={job.salary} />
            </div>
        </aside>
    );
}
