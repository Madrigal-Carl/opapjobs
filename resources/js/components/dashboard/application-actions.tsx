import { router } from '@inertiajs/react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/system/confirm-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    proceed as proceedRoute,
    reject as rejectRoute,
} from '@/routes/dashboard/applications';

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
            title="Reject this application?"
            description={`${applicantName} will be moved to the Rejected stage. This cannot be undone.`}
            confirmLabel="Reject application"
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
                    placeholder="Why is this application being rejected?"
                    data-testid={`input-reject-note-${applicationId}`}
                />
            </div>
        </ConfirmDialog>
    );
}
