import { CircleCheck, FileText, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { FieldError } from '@/components/applicant/match-blocks';
import { formatFileSize } from '@/data/applicant-profile';
import type { ApplicationDraftRecord } from '@/data/application-draft-store';
import type { ResumeDocument } from '@/types/applicant-profile';

export function ResumePicker({
    draft,
    documents,
    invalid,
    onPatch,
}: {
    draft: ApplicationDraftRecord;
    documents: ResumeDocument[];
    invalid: boolean;
    onPatch: (next: Partial<ApplicationDraftRecord>) => void;
}) {
    const [dragging, setDragging] = useState(false);
    const [fileError, setFileError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const errorId = invalid ? 'apply-resume-error' : undefined;

    function chooseFile(file?: File): void {
        setDragging(false);

        if (!file) {
            return;
        }

        if (!/\.(pdf|docx)$/i.test(file.name)) {
            setFileError('Choose a PDF or DOCX file.');

            return;
        }

        setFileError('');
        onPatch({
            resumeId: null,
            uploadedResume: {
                name: file.name,
                size: formatFileSize(file.size),
            },
        });
    }

    return (
        <>
            <div
                className="apply-doc-list"
                role="radiogroup"
                aria-label="Resume to send"
                aria-required="true"
                aria-invalid={invalid || undefined}
                aria-describedby={errorId}
            >
                {documents.map((document) => (
                    <label
                        key={document.id}
                        className={`apply-doc-option ${draft.resumeId === document.id ? 'is-selected' : ''}`}
                    >
                        <input
                            type="radio"
                            name="resume"
                            checked={draft.resumeId === document.id}
                            aria-invalid={invalid || undefined}
                            aria-describedby={errorId}
                            onChange={() => {
                                setFileError('');
                                onPatch({
                                    resumeId: document.id,
                                    uploadedResume: null,
                                });
                            }}
                            data-testid={`radio-resume-${document.id}`}
                        />
                        <FileText size={20} aria-hidden="true" />
                        <span className="apply-doc-copy">
                            <strong>{document.name}</strong>
                            <span className="apply-doc-meta">
                                {document.uploadedAt} · {document.size}
                            </span>
                        </span>
                        {draft.resumeId === document.id && (
                            <CircleCheck
                                className="apply-doc-check"
                                size={18}
                                aria-label="Selected"
                            />
                        )}
                    </label>
                ))}
                <label
                    className={`apply-doc-option ${draft.uploadedResume ? 'is-selected' : ''}`}
                >
                    <input
                        type="radio"
                        name="resume"
                        checked={Boolean(draft.uploadedResume)}
                        aria-invalid={invalid || undefined}
                        aria-describedby={errorId}
                        onChange={() =>
                            onPatch({
                                resumeId: null,
                                uploadedResume: { name: '', size: '' },
                            })
                        }
                        data-testid="radio-resume-upload"
                    />
                    <Upload size={20} aria-hidden="true" />
                    <span className="apply-doc-copy">
                        <strong>Upload a different file</strong>
                        <span className="apply-doc-meta">PDF or DOCX</span>
                    </span>
                </label>
            </div>
            {draft.uploadedResume && (
                <div
                    className={`apply-dropzone ${dragging ? 'is-dragging' : ''}`}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={(event) => {
                        if (
                            !event.currentTarget.contains(
                                event.relatedTarget as Node | null,
                            )
                        ) {
                            setDragging(false);
                        }
                    }}
                    onDrop={(event) => {
                        event.preventDefault();
                        chooseFile(event.dataTransfer.files[0]);
                    }}
                    data-testid="dropzone-apply-resume"
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,.docx"
                        className="sr-only"
                        aria-label="Upload your resume"
                        aria-invalid={
                            Boolean(fileError) || invalid || undefined
                        }
                        aria-describedby={
                            fileError ? 'apply-upload-error' : errorId
                        }
                        data-testid="input-apply-upload"
                        onChange={(event) => {
                            chooseFile(event.target.files?.[0]);
                            event.target.value = '';
                        }}
                    />
                    {draft.uploadedResume.name ? (
                        <div className="apply-upload-file">
                            <FileText size={22} aria-hidden="true" />
                            <span className="apply-doc-copy">
                                <strong>{draft.uploadedResume.name}</strong>
                                <span className="apply-doc-meta">
                                    {draft.uploadedResume.size} · Selected
                                </span>
                            </span>
                            <button
                                type="button"
                                className="apply-text-action"
                                onClick={() => {
                                    setFileError('');
                                    onPatch({
                                        uploadedResume: { name: '', size: '' },
                                    });
                                    inputRef.current?.focus();
                                }}
                                data-testid="button-apply-upload-remove"
                            >
                                <X size={16} aria-hidden="true" /> Remove
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="apply-dropzone-browse"
                            onClick={() => inputRef.current?.click()}
                            data-testid="button-apply-upload-browse"
                        >
                            <Upload size={24} aria-hidden="true" />
                            <strong>
                                Drop your resume here, or browse files
                            </strong>
                            <span>PDF or DOCX</span>
                        </button>
                    )}
                    {fileError && (
                        <div id="apply-upload-error">
                            <FieldError>{fileError}</FieldError>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
