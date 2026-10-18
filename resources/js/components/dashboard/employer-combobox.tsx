import {
    useEffect,
    useId,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import { Input } from '@/components/ui/input';
import { getEmployers, subscribeEmployers } from '@/data/employers';
import { cn } from '@/lib/utils';

/** Searchable employer name with keyboard suggestions and an add-new action. */
export function EmployerCombobox({
    value,
    onChange,
    onAddNew,
}: {
    value: string;
    onChange: (name: string) => void;
    onAddNew: (name: string) => void;
}) {
    const [focused, setFocused] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const boxRef = useRef<HTMLDivElement>(null);
    const listId = useId();
    const employers = useSyncExternalStore(
        subscribeEmployers,
        getEmployers,
        getEmployers,
    );
    const query = value.trim().toLowerCase();
    const options = employers.filter((employer) =>
        `${employer.name} ${employer.location}`.toLowerCase().includes(query),
    );
    const open = focused && query !== '';
    const count = options.length || 1;
    const active = Math.min(highlight, count - 1);

    useEffect(() => {
        const close = (event: PointerEvent) => {
            if (!boxRef.current?.contains(event.target as Node)) {
                setFocused(false);
            }
        };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, []);

    const choose = (index: number) => {
        setFocused(false);
        if (options[index]) {
            onChange(options[index].name);
        } else {
            onAddNew(value.trim());
        }
    };

    return (
        <div
            className="relative"
            ref={boxRef}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setFocused(false);
                }
            }}
        >
            <Input
                id="job-employer"
                value={value}
                onChange={(event) => {
                    onChange(event.target.value);
                    setHighlight(0);
                    setFocused(true);
                }}
                onFocus={() => setFocused(true)}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        setFocused(false);
                    }
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        event.preventDefault();
                        setFocused(true);
                        setHighlight(
                            (current) =>
                                (current +
                                    (event.key === 'ArrowDown' ? 1 : -1) +
                                    count) %
                                count,
                        );
                    }
                    if (event.key === 'Enter' && open) {
                        event.preventDefault();
                        choose(active);
                    }
                }}
                placeholder="Search or enter employer name"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={open ? `${listId}-${active}` : undefined}
                className="h-9 w-full px-3 py-0 text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                data-testid="input-employer-search"
            />
            {open && (
                <div
                    id={listId}
                    role="listbox"
                    aria-label="Employer suggestions"
                    className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[var(--line)] bg-white py-1 shadow-lg"
                    data-testid="employer-suggestions"
                >
                    {options.length ? (
                        options.map((employer, index) => (
                            <button
                                key={employer.name}
                                id={`${listId}-${index}`}
                                type="button"
                                tabIndex={-1}
                                role="option"
                                aria-selected={active === index}
                                onMouseDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setHighlight(index)}
                                onClick={() => choose(index)}
                                className={cn(
                                    'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40',
                                    active === index
                                        ? 'bg-[var(--teal-light)]'
                                        : 'hover:bg-[var(--surface-soft)]',
                                )}
                                data-testid={`employer-suggestion-${index}`}
                            >
                                <span className="text-sm font-medium text-[var(--navy)]">
                                    {employer.name}
                                </span>
                                <span className="text-xs text-[var(--slate)]">
                                    {employer.location} ·{' '}
                                    {employer.poeaLicenseNo}
                                </span>
                            </button>
                        ))
                    ) : (
                        <button
                            type="button"
                            tabIndex={-1}
                            id={`${listId}-0`}
                            role="option"
                            aria-selected
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => choose(0)}
                            className="w-full bg-[var(--teal-light)] px-3 py-3 text-left text-sm text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                            data-testid="button-add-employer"
                        >
                            + Add “{value.trim()}” as a new employer
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
