import { Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'inline-flex items-center gap-1 rounded-lg bg-muted p-1',
                className,
            )}
            {...props}
        >
            <span className="flex items-center rounded-md bg-card px-3.5 py-1.5 text-sm text-foreground shadow-xs">
                <Sun className="-ml-1 h-4 w-4" />
                <span className="ml-1.5">Light</span>
            </span>
        </div>
    );
}
