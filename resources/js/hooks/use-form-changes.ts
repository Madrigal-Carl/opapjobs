import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

/**
 * Dirty-state tracking for a full-page or sheet form (spec §5.2).
 *
 * Keeps the pristine snapshot the form loaded from, so discarding simply
 * restores it, and derives the edited keys so the change bar can count them
 * and each field can show a teal dot. `beforeunload` guards a hard reload
 * while there is anything to lose.
 */
export function useFormChanges<T extends Record<string, unknown>>(initial: T) {
    const [pristine, setPristine] = useState<T>(initial);
    const [values, setValues] = useState<T>(initial);

    const changedFields = useMemo(
        () =>
            (Object.keys(values) as (keyof T)[]).filter(
                (key) => values[key] !== pristine[key],
            ),
        [values, pristine],
    );

    const isDirty = changedFields.length > 0;

    const isFieldDirty = useCallback(
        (key: keyof T) => values[key] !== pristine[key],
        [values, pristine],
    );

    const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
        setValues((current) => ({ ...current, [key]: value }));
    }, []);

    const setMany = useCallback((patch: Partial<T>) => {
        setValues((current) => ({ ...current, ...patch }));
    }, []);

    /** Restores the last saved snapshot. */
    const discard = useCallback(() => {
        setValues(pristine);
    }, [pristine]);

    /**
     * Marks the current values as the new baseline, e.g. right after a save
     * commits them.
     */
    const accept = useCallback(() => {
        setPristine(values);
    }, [values]);

    // Warn before the tab closes or reloads with unsaved work.
    // Registered only while dirty so a clean page never blocks a reload.
    useEffect(() => {
        if (!isDirty) {
            return;
        }

        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', onBeforeUnload);

        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isDirty]);

    /** Commits the current values as the new baseline and toasts. */
    const save = useCallback(
        (commit: (current: T) => void, message: string) => {
            commit(values);
            setPristine(values);
            toast.success(message);
        },
        [values],
    );

    return {
        values,
        changedFields,
        isDirty,
        isFieldDirty,
        setValue,
        setMany,
        discard,
        accept,
        save,
    };
}
