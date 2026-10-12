import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DashboardEmptyState({
    icon: Icon,
    title,
    message,
    onReset,
}: {
    icon: LucideIcon;
    title: string;
    message: string;
    onReset?: () => void;
}) {
    return (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-semibold text-[var(--navy)]">{title}</p>
            <p className="max-w-sm text-sm text-[var(--slate)]">{message}</p>
            {onReset && (
                <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={onReset}
                >
                    Reset filters
                </Button>
            )}
        </div>
    );
}
