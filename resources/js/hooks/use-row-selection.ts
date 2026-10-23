import { useCallback, useState } from 'react';

/**
 * Checkbox selection for a console list, keyed by row id.
 *
 * Selection is deliberately *not* derived from the table: rows disappear as
 * filters change and records get archived, and a stale id simply drops out of
 * the set rather than corrupting the count. That keeps the bulk bar honest
 * about how many records a bulk action would touch — which is what the
 * impact-before-action confirm reads from.
 */
export type RowSelection = {
    selected: ReadonlySet<string>;
    isSelected: (id: string) => boolean;
    toggle: (id: string) => void;
    /** Adds or removes a whole page in one update. */
    setMany: (ids: string[], select: boolean) => void;
    clear: () => void;
    count: number;
};

export function useRowSelection(): RowSelection {
    const [selected, setSelected] = useState<ReadonlySet<string>>(
        () => new Set<string>(),
    );

    const toggle = useCallback((id: string) => {
        setSelected((current) => {
            const next = new Set(current);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }, []);

    const setMany = useCallback((ids: string[], select: boolean) => {
        setSelected((current) => {
            const next = new Set(current);

            for (const id of ids) {
                if (select) {
                    next.add(id);
                } else {
                    next.delete(id);
                }
            }

            return next;
        });
    }, []);

    const clear = useCallback(() => {
        setSelected(new Set<string>());
    }, []);

    const isSelected = useCallback(
        (id: string) => selected.has(id),
        [selected],
    );

    return {
        selected,
        isSelected,
        toggle,
        setMany,
        clear,
        count: selected.size,
    };
}
