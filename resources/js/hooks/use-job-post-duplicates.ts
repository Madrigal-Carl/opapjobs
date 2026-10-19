import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { DuplicateJobPost } from '@/data/job-form';
import { duplicates } from '@/routes/dashboard/jobs';
import { flashServerToast } from '@/hooks/use-flash-toast';

export function useJobPostDuplicates(
    employerId: number | null,
    title: string,
    subcategoryId: number | null,
): DuplicateJobPost[] {
    const [result, setResult] = useState<{
        key: string;
        duplicates: DuplicateJobPost[];
    } | null>(null);
    const key = JSON.stringify([employerId, title.trim(), subcategoryId]);
    useEffect(() => {
        if (!title.trim() || subcategoryId === null) return;
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const response = await fetch(
                    duplicates({
                        query: {
                            employer_id: employerId,
                            job_title: title.trim(),
                            job_subcategory_id: subcategoryId,
                        },
                    }).url,
                    {
                        signal: controller.signal,
                        headers: { Accept: 'application/json' },
                    },
                );
                const body = await response.json();
                if (controller.signal.aborted) return;
                if (!response.ok) {
                    if (!flashServerToast(body))
                        router.flash('toast', {
                            type: 'error',
                            message:
                                'Could not check for duplicate job posts. Please try again.',
                        });
                    return;
                }
                setResult({ key, duplicates: body.duplicates });
            } catch {
                if (!controller.signal.aborted)
                    toast.error(
                        'Could not reach the server. Check your connection and try again.',
                    );
            }
        }, 350);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [employerId, title, subcategoryId, key]);
    return result?.key === key ? result.duplicates : [];
}
