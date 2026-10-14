export function SummaryStat({
    label,
    value,
    active = false,
}: {
    label: string;
    value: string | number;
    active?: boolean;
}) {
    return (
        <div
            className={`flex min-w-24 flex-col gap-0.5 rounded-lg border px-3 py-2 ${
                active
                    ? 'border-[var(--teal)] bg-[var(--teal-light)]'
                    : 'border-[var(--line)] bg-white'
            }`}
        >
            <span
                className={`text-xl leading-none font-bold tabular-nums ${
                    active ? 'text-[var(--teal)]' : 'text-[var(--navy)]'
                }`}
            >
                {value}
            </span>
            <span
                className={`text-xs ${
                    active ? 'text-[var(--navy)]' : 'text-[var(--slate)]'
                }`}
            >
                {label}
            </span>
        </div>
    );
}
