import { FileText, X } from 'lucide-react';
import { useState } from 'react';
import { ApplyTag, focusApplyField } from '@/components/applicant/apply-field';
import { FieldError } from '@/components/applicant/match-blocks';

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

    return names.map((name, index) => {
        const file = files.get(name);
        const id = `apply-document-${index}`;
        const error =
            errors[index] ||
            (blocked && !file ? `Upload ${name} before continuing.` : '');
        return (
            <div key={name} className={`field ${error ? 'is-invalid' : ''}`}>
                <label className="apply-field-label" htmlFor={id}>
                    {name} <ApplyTag required />
                </label>
                <p className="field-hint" id={`${id}-hint`}>
                    PDF only, up to 10 MB. Files must be selected again after a
                    refresh.
                </p>
                {file ? (
                    <div className="apply-upload-file">
                        <FileText size={20} aria-hidden="true" />
                        <span className="apply-doc-copy">
                            <strong>{file.name}</strong>
                        </span>
                        <button
                            type="button"
                            id={id}
                            className="apply-text-action"
                            aria-label={`Remove ${name} file`}
                            data-testid={`button-remove-required-document-${index}`}
                            onClick={() => {
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
                    <input
                        id={id}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="field-control"
                        aria-required="true"
                        aria-invalid={Boolean(error) || undefined}
                        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
                        data-testid={`input-required-document-${index}`}
                        onChange={(event) => {
                            const selected = event.target.files?.[0];
                            event.target.value = '';
                            if (!selected) return;
                            const message =
                                !/\.pdf$/i.test(selected.name) ||
                                (selected.type !== '' &&
                                    selected.type !== 'application/pdf')
                                    ? 'Choose a PDF file.'
                                    : selected.size > 10 * 1024 * 1024
                                      ? 'Choose a PDF no larger than 10 MB.'
                                      : '';
                            setErrors((current) => ({
                                ...current,
                                [index]: message,
                            }));
                            if (!message) onChange(name, selected);
                        }}
                    />
                )}
                {error && (
                    <div id={`${id}-error`}>
                        <FieldError>{error}</FieldError>
                    </div>
                )}
            </div>
        );
    });
}
