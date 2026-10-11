export default function Heading({
    title,
    description,
    variant = 'default',
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
}) {
    if (variant === 'small') {
        return (
            <header className="mb-1">
                <h2 className="text-lg font-semibold text-[var(--navy)]">
                    {title}
                </h2>
                {description && (
                    <p className="mt-0.5 text-sm text-[var(--slate)]">
                        {description}
                    </p>
                )}
            </header>
        );
    }

    return (
        <header className="mb-8 space-y-1">
            <h2 className="font-serif text-2xl font-bold tracking-[-0.02em] text-[var(--navy)] sm:text-3xl">
                {title}
            </h2>
            {description && (
                <p className="text-sm text-[var(--slate)]">{description}</p>
            )}
        </header>
    );
}
