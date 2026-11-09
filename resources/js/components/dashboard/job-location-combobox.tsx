import { MapPin } from 'lucide-react';
import { useEffect, useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { countryOptions } from '@/data/countries';
import { cn } from '@/lib/utils';

export function JobLocationCombobox({
    id,
    value,
    onChange,
    className,
    ...inputProps
}: Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> & {
    id: string;
    value: string;
    onChange: (location: string) => void;
}) {
    const [search, setSearch] = useState(value);
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    useEffect(() => {
        if (value) setSearch(value);
    }, [value]);

    const query = search.trim().toLowerCase();
    const matches = countryOptions.includes(search)
        ? countryOptions
        : countryOptions.filter((country) =>
              country.toLowerCase().includes(query),
          );
    const active = Math.min(highlight, matches.length - 1);
    const listId = `${id}-options`;
    const choose = (country: string) => {
        onChange(country);
        setSearch(country);
        setOpen(false);
    };

    return (
        <div
            className="relative"
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                    setOpen(false);
            }}
        >
            <MapPin
                className="pointer-events-none absolute top-2.5 left-3 size-4 text-[var(--slate)]"
                aria-hidden="true"
            />
            <Input
                {...inputProps}
                id={id}
                value={search}
                autoComplete="off"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={
                    open && active >= 0 ? `${listId}-${active}` : undefined
                }
                placeholder="Search and choose a country or region"
                className={cn(
                    'h-9 w-full text-sm text-[var(--navy)]',
                    className,
                    'pl-9',
                )}
                onFocus={() => setOpen(true)}
                onChange={(event) => {
                    setSearch(event.target.value);
                    onChange('');
                    setHighlight(0);
                    setOpen(true);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        setOpen(false);
                    }
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        event.preventDefault();
                        setOpen(true);
                        setHighlight((current) =>
                            matches.length
                                ? open
                                    ? (current +
                                          (event.key === 'ArrowDown' ? 1 : -1) +
                                          matches.length) %
                                      matches.length
                                    : 0
                                : 0,
                        );
                    }
                    if (event.key === 'Enter' && open) {
                        event.preventDefault();
                        if (matches[active]) choose(matches[active]);
                    }
                }}
            />
            {open && (
                <div
                    id={listId}
                    role="listbox"
                    aria-label="Job location suggestions"
                    className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[var(--line)] bg-white py-1 shadow-lg"
                >
                    {matches.map((country, index) => (
                        <button
                            key={country}
                            id={`${listId}-${index}`}
                            type="button"
                            role="option"
                            tabIndex={-1}
                            aria-selected={active === index}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setHighlight(index)}
                            onClick={() => choose(country)}
                            className={cn(
                                'w-full px-3 py-2 text-left text-sm text-[var(--navy)]',
                                active === index
                                    ? 'bg-[var(--teal-light)]'
                                    : 'hover:bg-[var(--surface-soft)]',
                            )}
                        >
                            {country}
                        </button>
                    ))}
                    {matches.length === 0 && (
                        <p
                            role="status"
                            className="px-3 py-2 text-sm text-[var(--slate)]"
                        >
                            No matching country or region.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
