import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

type TableFilters = Record<string, string | number | null> & {
    q: string | null;
};

export function useServerTable<T extends TableFilters>({
    url,
    filters,
    page,
    defaults,
    only,
}: {
    url: string;
    filters: T;
    page: number;
    defaults: T;
    only: string[];
}) {
    const [values, setValues] = useState(filters);
    const [loading, setLoading] = useState(false);
    const current = useRef(filters);
    const pendingSearch = useRef(false);
    const cancelVisit = useRef<(() => void) | null>(null);
    const requestId = useRef(0);
    const debouncedQ = useDebouncedValue(values.q ?? '', 300);

    const cancel = useCallback(() => {
        requestId.current += 1;
        cancelVisit.current?.();
        cancelVisit.current = null;
    }, []);

    const visit = useCallback(
        (next: T, nextPage = 1) => {
            cancel();
            const id = requestId.current;
            const params: Record<string, string | number> = {};

            for (const [key, value] of Object.entries(next)) {
                const normalized =
                    key === 'q' && typeof value === 'string'
                        ? value.trim()
                        : value;

                if (
                    normalized !== null &&
                    normalized !== '' &&
                    normalized !== defaults[key]
                ) {
                    params[key] = normalized;
                }
            }

            if (nextPage > 1) {
                params.page = nextPage;
            }

            router.get(url, params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only,
                onCancelToken: (token) => {
                    cancelVisit.current = () => token.cancel();
                },
                onStart: () => setLoading(true),
                onFinish: () => {
                    if (id === requestId.current) {
                        setLoading(false);
                        cancelVisit.current = null;
                    }
                },
            });
        },
        [cancel, defaults, only, url],
    );

    useEffect(() => {
        // Server props also change on history navigation; never restore stale local filters over them.
        pendingSearch.current = false;
        current.current = filters;
        setValues(filters);
    }, [filters, page]);

    useEffect(() => {
        if (pendingSearch.current && debouncedQ === (current.current.q ?? '')) {
            pendingSearch.current = false;
            visit(current.current);
        }
    }, [debouncedQ, values.q, visit]);

    useEffect(() => cancel, [cancel]);

    function setFilter<K extends keyof T>(key: K, value: T[K]) {
        cancel();
        setLoading(false);
        const next = { ...current.current, [key]: value };
        current.current = next;
        setValues(next);
        pendingSearch.current = key === 'q';

        if (key !== 'q') {
            visit(next);
        }
    }

    function reset() {
        pendingSearch.current = false;
        current.current = defaults;
        setValues(defaults);
        visit(defaults);
    }

    function setPage(nextPage: number) {
        pendingSearch.current = false;
        visit(current.current, nextPage);
    }

    return { values, page, loading, setFilter, setPage, reset };
}
