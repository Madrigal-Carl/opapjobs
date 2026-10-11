import { Globe } from 'lucide-react';

export default function AppLogo() {
    return (
        <>
            <span className="flex size-8 shrink-0 items-center justify-center">
                <Globe
                    className="size-6 text-[var(--amber)]"
                    strokeWidth={1.8}
                    aria-hidden="true"
                />
            </span>
            <span className="brand-name truncate">OPAP Job Abroad</span>
        </>
    );
}
