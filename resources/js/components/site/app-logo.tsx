import { Globe } from 'lucide-react';

type AppLogoProps = {
    /** Avatar container classes from the call site, so each keeps its own sizing. */
    className?: string;
    /** Tint for the mark: amber on the navy tiles, navy on the light ones. */
    tone?: 'amber' | 'navy';
};

/**
 * The OPAP mark, centered inside an avatar container.
 *
 * The job catalogue ships no real agency or employer logos, so every agency and
 * job avatar renders the app's own mark instead of requesting a missing image.
 */
export function AppLogo({ className, tone = 'amber' }: AppLogoProps) {
    return (
        <span
            className={`app-logo-mark app-logo-mark-${tone}${className ? ` ${className}` : ''}`}
            aria-hidden="true"
        >
            <Globe strokeWidth={1.8} />
        </span>
    );
}
