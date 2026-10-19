import { X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PROFICIENCY_FORM_LABELS } from '@/data/job-attributes';
import type { JobLanguage, LanguageProficiency } from '@/types/job';

/** Selected language chips with an inline language/proficiency add row. */
export function LanguageChipsField({
    value,
    onChange,
    options,
    proficiencies,
}: {
    value: JobLanguage[];
    onChange: (value: JobLanguage[]) => void;
    options: string[];
    proficiencies?: LanguageProficiency[];
}) {
    const [adding, setAdding] = useState(false);
    const [language, setLanguage] = useState('');
    const [proficiency, setProficiency] =
        useState<LanguageProficiency>('conversational');
    const available = options.filter(
        (option) => !value.some((entry) => entry.language === option),
    );

    return (
        <div className="flex flex-col gap-2">
            <div
                className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-[var(--line)] bg-white px-2 py-1"
                role="group"
                aria-label="Required languages"
            >
                {value.map((entry) => (
                    <span
                        key={entry.language}
                        className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-xs font-medium text-[var(--navy)]"
                    >
                        {entry.language} (
                        {PROFICIENCY_FORM_LABELS[entry.proficiency]})
                        <Button
                            type="button"
                            variant="ghost"
                            className="size-3 rounded p-0"
                            aria-label={`Remove ${entry.language}`}
                            onClick={() =>
                                onChange(
                                    value.filter(
                                        (item) =>
                                            item.language !== entry.language,
                                    ),
                                )
                            }
                            data-testid={`button-remove-language-${entry.language}`}
                        >
                            <X className="size-3" aria-hidden="true" />
                        </Button>
                    </span>
                ))}
                <Button
                    type="button"
                    variant="ghost"
                    className="rounded-md border border-dashed border-[var(--line)] px-2 py-1 text-xs text-[var(--slate)] hover:border-[var(--teal)]"
                    onClick={() => {
                        setLanguage(available[0] ?? '');
                        setAdding(true);
                    }}
                    disabled={available.length === 0 || adding}
                    data-testid="button-add-language"
                >
                    + Add language
                </Button>
            </div>
            {adding && (
                <div
                    className="flex flex-wrap items-center gap-2"
                    data-testid="language-add-row"
                >
                    <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger
                            className="h-9 min-w-32 flex-1 border-[var(--line)] bg-white text-xs focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                            aria-label="Language"
                            data-testid="select-new-language"
                        >
                            <SelectValue placeholder="Choose language" />
                        </SelectTrigger>
                        <SelectContent>
                            {available.map((option) => (
                                <SelectItem
                                    value={option}
                                    key={option}
                                    data-testid={`language-option-${option}`}
                                >
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={proficiency}
                        onValueChange={(next) =>
                            setProficiency(next as LanguageProficiency)
                        }
                    >
                        <SelectTrigger
                            className="h-9 min-w-40 flex-1 border-[var(--line)] bg-white text-xs focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                            aria-label="Language proficiency"
                            data-testid="select-new-proficiency"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(PROFICIENCY_FORM_LABELS).filter(([key]) => !proficiencies || proficiencies.includes(key as LanguageProficiency)).map(
                                ([key, label]) => (
                                    <SelectItem
                                        key={key}
                                        value={key}
                                        data-testid={`proficiency-option-${key}`}
                                    >
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        size="sm"
                        disabled={!available.includes(language)}
                        onClick={() => {
                            onChange([...value, { language, proficiency }]);
                            setAdding(false);
                        }}
                        data-testid="button-confirm-language"
                    >
                        Add
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAdding(false)}
                        data-testid="button-cancel-language"
                    >
                        Cancel
                    </Button>
                </div>
            )}
        </div>
    );
}
