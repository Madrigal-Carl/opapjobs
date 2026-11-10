import { FileText, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { AttachmentFeedback } from '@/components/applicant/attachment-feedback';
import { ApplyTag, focusApplyField } from '@/components/applicant/apply-field';
import { FieldError } from '@/components/applicant/match-blocks';
import { formatFileSize } from '@/data/applicant-profile';

export function RequiredDocumentUploads({
    names,
    files,
    blocked,
    onChange,
}: {
    names: string[];
    files: ReadonlyMap<string, File>;
    blocked: boolean;
    onChange: (name: string, file: File | null) => void;
}) {
    const [errors, setErrors] = useState<Record<number, string>>({});
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [attachmentVersions, setAttachmentVersions] = useState<
        Record<number, number>
    >({});

    return names.map((name, index) => {
        const file = files.get(name);
        const id = `apply-document-${index}`;
        const error =
            errors[index] ||
            (blocked && !file ? `Upload ${name} before continuing.` : '');

        const chooseFile = (selected?: File) => {
            setDraggingIndex(null);
            if (!selected) return;
            const message =
                !/\.pdf$/i.test(selected.name) ||
                (selected.type !== '' && selected.type !== 'application/pdf')
                    ? 'Choose a PDF file.'
                    : selected.size > 10 * 1024 * 1024
                      ? 'Choose a PDF no larger than 10 MB.'
                      : '';
            setErrors((current) => ({ ...current, [index]: message }));
            if (!message) {
                setAttachmentVersions((versions) => ({
                    ...versions,
                    [index]: (versions[index] ?? 0) + 1,
                }));
                onChange(name, selected);
            }
        };

        return (
            <div key={name} className={`field ${error ? 'is-invalid' : ''}`}>
                <label className="apply-field-label" htmlFor={id}>
                    {name} <ApplyTag required />
                </label>
                <p className="field-hint" id={`${id}-hint`}>
                    PDF only, up to 10 MB. Files upload when you submit and must
                    be selected again after a refresh.
                </p>
                <div
                    className={`apply-dropzone ${draggingIndex === index ? 'is-dragging' : ''}`}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDraggingIndex(index);
                    }}
                    onDragLeave={(event) => {
                        if (
                            !event.currentTarget.contains(
                                event.relatedTarget as Node | null,
                            )
                        ) {
                            setDraggingIndex(null);
                        }
                    }}
                    onDrop={(event) => {
                        event.preventDefault();
                        chooseFile(event.dataTransfer.files[0]);
                    }}
                    data-testid={`dropzone-required-document-${index}`}
                >
                    <input
                        id={id}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="sr-only"
                        aria-label={`Upload ${name}`}
                        aria-required="true"
                        aria-invalid={Boolean(error) || undefined}
                        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
                        data-testid={`input-required-document-${index}`}
                        onChange={(event) => {
                            chooseFile(event.target.files?.[0]);
                            event.target.value = '';
                        }}
                    />
                    {file ? (
                        <div
                            className="apply-upload-file"
                            key={attachmentVersions[index] ?? 0}
                        >
                            <FileText size={22} aria-hidden="true" />
                            <span className="apply-doc-copy" role="status">
                                <strong>{file.name}</strong>
                                <span className="apply-doc-meta">
                                    {formatFileSize(file.size)} · Uploads with
                                    your application
                                </span>
                                <AttachmentFeedback />
                            </span>
                            <button
                                type="button"
                                className="apply-text-action"
                                aria-label={`Remove ${name} file`}
                                data-testid={`button-remove-required-document-${index}`}
                                onClick={() => {
                                    setErrors((current) => ({
                                        ...current,
                                        [index]: '',
                                    }));
                                    onChange(name, null);
                                    requestAnimationFrame(() =>
                                        focusApplyField(id),
                                    );
                                }}
                            >
                                <X size={16} aria-hidden="true" /> Remove
                            </button>
                        </div>
                    ) : (
                        <label className="apply-dropzone-browse" htmlFor={id}>
                            <Upload size={24} aria-hidden="true" />
                            <strong>
                                Drop your {name} here, or browse files
                            </strong>
                            <span>PDF · Up to 10 MB</span>
                        </label>
                    )}
                </div>
                {error && (
                    <div id={`${id}-error`}>
                        <FieldError>{error}</FieldError>
                    </div>
                )}
            </div>
        );
    });
}
