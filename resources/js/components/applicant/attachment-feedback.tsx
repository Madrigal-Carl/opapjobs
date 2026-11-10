import { CircleCheck } from 'lucide-react';

export function AttachmentFeedback() {
    return (
        <span className="apply-attachment-feedback">
            <span
                className="apply-upload-progress apply-attachment-progress"
                aria-hidden="true"
            >
                <span />
            </span>
            <span className="apply-attachment-caption" role="status">
                <span className="apply-attachment-preparing" aria-hidden="true">
                    Attaching file…
                </span>
                <span className="apply-attachment-ready">
                    <CircleCheck size={14} aria-hidden="true" /> Ready to submit
                </span>
            </span>
        </span>
    );
}
