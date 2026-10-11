import { useFlashToast } from '@/hooks/use-flash-toast';
import { useAppearance } from '@/hooks/use-appearance';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
    const { appearance } = useAppearance();

    useFlashToast();

    return (
        <Sonner
            theme={appearance}
            className="toaster group"
            position="bottom-right"
            style={
                {
                    '--normal-bg': 'hsl(var(--popover))',
                    '--normal-text': 'hsl(var(--popover-foreground))',
                    '--normal-border': 'hsl(var(--border))',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
