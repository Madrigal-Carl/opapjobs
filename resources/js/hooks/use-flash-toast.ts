import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

/** Non-Inertia JSON errors re-enter the same flash pipeline using the server's safe message. */
export function flashServerToast(value: unknown): boolean {
    if (typeof value !== 'object' || value === null || !('toast' in value))
        return false;
    const data = value.toast;
    if (
        typeof data !== 'object' ||
        data === null ||
        !('type' in data) ||
        !('message' in data) ||
        typeof data.type !== 'string' ||
        !['success', 'info', 'warning', 'error'].includes(data.type) ||
        typeof data.message !== 'string'
    )
        return false;
    router.flash('toast', { type: data.type, message: data.message });
    return true;
}

export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            const data = flash?.toast as FlashToast | undefined;

            if (!data) {
                return;
            }

            toast[data.type](data.message);
        });
    }, []);
}
