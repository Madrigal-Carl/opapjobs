export function SummaryStat({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) {
    return (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-1.5">
            <span className="text-lg font-bold text-[var(--navy)] tabular-nums">
                {value}
            </span>
            <span className="text-xs text-[var(--slate)]">{label}</span>
        </div>
    );
}
