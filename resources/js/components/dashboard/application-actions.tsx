import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/system/confirm-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    proceed as proceedRoute,
    reject as rejectRoute,
    review as reviewRoute,
} from '@/routes/dashboard/applications';

/**
 * Marks a pending application as Reviewed when an eligible viewer opens it.
 * Sends at most one request per page visit (StrictMode re-runs effects) and
 * stays out of the Proceed/Reject `processing` state. The server re-checks
 * eligibility and ignores the request when it does not apply.
 */
export function useAutoReviewOnOpen(applicationId: number, eligible: boolean) {
    const requestedFor = useRef<number | null>(null);

    useEffect(() => {
        if (!eligible || requestedFor.current === applicationId) {
            return;
        }
        requestedFor.current = applicationId;
        router.patch(
            reviewRoute.url(applicationId),
            {},
            { preserveScroll: true, only: ['application'] },
        );
    }, [applicationId, eligible]);
}

/**
 * Shared Proceed/Reject requests. Callers pass the props to reload: the list
 * keeps its table payload, the detail page its application.
 */
export function useApplicationStageTransition(
    only: string[],
    applicationId: number,
) {
    const [processing, setProcessing] = useState(false);

    const run = (url: string, data: Record<string, string> = {}) =>
        router.patch(url, data, {
            preserveScroll: true,
            only,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
        });

    return {
        processing,
        proceed: () => run(proceedRoute.url(applicationId)),
        reject: (note: string) =>
            run(
                rejectRoute.url(applicationId),
                note.trim() ? { note: note.trim() } : {},
            ),
    };
}

export function RejectApplicationDialog({
    applicationId,
    applicantName,
    open,
    busy,
    onOpenChange,
    onConfirm,
}: {
    applicationId: number;
    applicantName: string;
    open: boolean;
    busy: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (note: string) => void;
}) {
    const [note, setNote] = useState('');

    return (
        <ConfirmDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Mark this application as not selected?"
            description={`${applicantName} will be moved to the Not Selected stage and emailed that the agency is not proceeding. This cannot be undone.`}
            confirmLabel="Mark as not selected"
            destructive
            busy={busy}
            onConfirm={() => onConfirm(note)}
            data-testid={`dialog-reject-application-${applicationId}`}
        >
            <div className="flex flex-col gap-2">
                <Label htmlFor={`reject-note-${applicationId}`}>
                    Reason (optional)
                </Label>
                <Textarea
                    id={`reject-note-${applicationId}`}
                    value={note}
                    maxLength={500}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Why was this applicant not selected? Only staff see this note."
                    data-testid={`input-reject-note-${applicationId}`}
                />
            </div>
        </ConfirmDialog>
    );
}
