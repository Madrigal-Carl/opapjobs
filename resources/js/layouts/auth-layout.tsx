import { AppLogo } from '@/components/site/app-logo';
import { Card } from '@/components/ui/card';
import PublicLayout from '@/layouts/public-layout';
import type { AuthLayoutProps } from '@/types';

/**
 * Chrome for the secondary auth screens (forgot/reset/confirm password, verify
 * email, two-factor). Login and register are full-bleed and use no layout.
 */
export default function AuthLayout({
    title = '',
    description = '',
    children,
}: AuthLayoutProps) {
    return (
        <PublicLayout>
            <section className="flex min-h-svh items-center justify-center px-5 pt-28 pb-16">
                <div className="w-full max-w-md">
                    <div className="mb-7 flex flex-col items-center gap-3 text-center">
                        <AppLogo
                            className="h-12 w-12 rounded-md bg-[hsl(var(--navy-deep))]"
                            tone="amber"
                        />
                        <h1 className="font-serif text-2xl font-extrabold text-[hsl(var(--navy))]">
                            {title}
                        </h1>
                        {description && (
                            <p className="text-sm text-[hsl(var(--slate))]">
                                {description}
                            </p>
                        )}
                    </div>
                    <Card className="gap-0 px-6 py-6">{children}</Card>
                </div>
            </section>
        </PublicLayout>
    );
}
