import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * The documents an applicant has to hand in for this posting.
 *
 * Deliberately free text rather than a fixed list: what an employer asks for
 * varies per vacancy ("COC", "PSNC", "NBI clearance"), and the applicant side
 * has no vocabulary of its own to validate against. The list is stored as a
 * plain array of names, which is why this is a chips field rather than the
 * shaped row editor the screening questions use.
 */
export function JobPostDocumentsField({
    value,
    onChange,
    error,
}: {
    value: string[];
    onChange: (value: string[]) => void;
    error?: string;
}) {
    const [draft, setDraft] = useState('');

    const add = () => {
        const name = draft.trim();

        // Ignored rather than rejected: an accidental empty entry or a repeat
        // is not worth a validation error, and silently dropping it keeps the
        // list in the shape the schema expects.
        if (name === '' || value.includes(name)) {
            setDraft('');

            return;
        }

        onChange([...value, name]);
        setDraft('');
    };

    return (
        <div className="flex min-w-0 flex-col gap-2">
            {value.length > 0 && (
                <ul
                    className="flex flex-wrap items-center gap-2"
                    data-testid="list-required-documents"
                >
                    {value.map((document) => (
                        <li key={document}>
                            <span className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-medium text-[var(--navy)]">
                                {document}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="size-4 rounded p-0"
                                    aria-label={`Remove ${document}`}
                                    onClick={() =>
                                        onChange(
                                            value.filter(
                                                (item) => item !== document,
                                            ),
                                        )
                                    }
                                    data-testid={`button-remove-document-${document}`}
                                >
                                    <X className="size-3" aria-hidden="true" />
                                </Button>
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                            return;
                        }

                        // Keep the Enter key from submitting the whole posting.
                        event.preventDefault();
                        add();
                    }}
                    placeholder="e.g. COC, PSNC, NBI clearance"
                    aria-label="Add a required document"
                    className="h-9 min-w-0 flex-1"
                    data-testid="input-add-document"
                />
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-9"
                    onClick={add}
                    disabled={draft.trim() === ''}
                    data-testid="button-add-document"
                >
                    <Plus className="size-4" aria-hidden="true" /> Add document
                </Button>
            </div>

            <InputError
                message={error}
                role="alert"
                data-testid="error-required-documents"
            />
        </div>
    );
}
