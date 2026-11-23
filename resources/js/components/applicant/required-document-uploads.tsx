import { CircleCheck, FileText, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { AttachmentFeedback } from '@/components/applicant/attachment-feedback';
import { ApplyTag, focusApplyField } from '@/components/applicant/apply-field';
import { FieldError } from '@/components/applicant/match-blocks';
import { formatFileSize } from '@/data/applicant-profile';
import type { ResumeDocument } from '@/types/applicant-profile';

/** A required document: a new upload, or a PDF already on the profile. */
export type SupportingDocument = File | ResumeDocument;

/** Profile files carry an id; a freshly chosen `File` does not. */
export const isProfileDocument = (
    value: SupportingDocument,
): value is ResumeDocument => 'id' in value;

export function RequiredDocumentUploads({
    names,
    files,
    blocked,
    onChange,
    documents = [],
}: {
    names: string[];
    files: ReadonlyMap<string, SupportingDocument>;
    blocked: boolean;
    onChange: (name: string, file: SupportingDocument | null) => void;
    /** The applicant's profile files; only PDFs can stand in for a document. */
    documents?: ResumeDocument[];
}) {
    const profilePdfs = documents.filter((document) =>
        /\.pdf$/i.test(document.name),
    );

    const [errors, setErrors] = useState<Record<number, string>>({});
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [attachmentVersions, setAttachmentVersions] = useState<
        Record<number, number>
    >({});

    return names.map((name, index) => {
        const chosen = files.get(name);
        const file = chosen && !isProfileDocument(chosen) ? chosen : undefined;
        const picked = chosen && isProfileDocument(chosen) ? chosen : undefined;
        const id = `apply-document-${index}`;
        const error =
            errors[index] ||
            (blocked && !chosen ? `Upload ${name} before continuing.` : '');

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
                    {profilePdfs.length > 0
                        ? 'Pick a PDF from your profile, or upload one (PDF only, up to 10 MB).'
                        : 'PDF only, up to 10 MB. Files upload when you submit and must be selected again after a refresh.'}
                </p>
                {profilePdfs.length > 0 && (
                    <div
                        className="apply-doc-list"
                        role="radiogroup"
                        aria-label={`${name} from your profile`}
                        aria-invalid={Boolean(error) || undefined}
                    >
                        {profilePdfs.map((document) => (
                            <label
                                key={document.id}
                                className={`apply-doc-option ${picked?.id === document.id ? 'is-selected' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name={`${id}-profile`}
                                    checked={picked?.id === document.id}
                                    onChange={() => {
                                        setErrors((current) => ({
                                            ...current,
                                            [index]: '',
                                        }));
                                        onChange(name, document);
                                    }}
                                    data-testid={`radio-required-document-${index}-${document.id}`}
                                />
                                <FileText size={20} aria-hidden="true" />
                                <span className="apply-doc-copy">
                                    <strong>{document.name}</strong>
                                    <span className="apply-doc-meta">
                                        {document.uploadedAt} · {document.size}{' '}
                                        · From your profile
                                    </span>
                                </span>
                                {picked?.id === document.id && (
                                    <CircleCheck
                                        className="apply-doc-check"
                                        size={18}
                                        aria-label="Selected"
                                    />
                                )}
                            </label>
                        ))}
                    </div>
                )}
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
                                {profilePdfs.length > 0
                                    ? `Or drop a different ${name} here, or browse files`
                                    : `Drop your ${name} here, or browse files`}
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
