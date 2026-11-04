import type { OverviewDayPoint } from '@/types/overview';

/**
 * Shared trend line for the dashboard overviews.
 *
 * Split out of `agency-overview` so the hiring/system and platform
 * overviews render the identical chart from one implementation — the
 * mock series and the database-backed series are the same shape, so the
 * chart never needs to know which one it was handed.
 */
export function formatShortDate(date: string): string {
    return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

export function TrendChart({ days }: { days: OverviewDayPoint[] }) {
    const width = 620;
    const height = 240;
    const left = 34;
    const right = 10;
    const top = 13;
    const bottom = 30;
    const max = Math.max(4, ...days.map((day) => day.applications));
    const innerW = width - left - right;
    const innerH = height - top - bottom;
    const coords = days.map((day, index) => ({
        x:
            left +
            (days.length <= 1
                ? innerW / 2
                : (index * innerW) / (days.length - 1)),
        y: top + innerH - (day.applications / max) * innerH,
    }));
    const line = coords
        .map(
            (point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`,
        )
        .join(' ');
    const fill = `${line} L${left + innerW},${top + innerH} L${left},${top + innerH} Z`;
    const labels =
        days.length > 14
            ? days.filter(
                  (_, index) =>
                      index % Math.ceil(days.length / 7) === 0 ||
                      index === days.length - 1,
              )
            : days;

    return (
        <svg
            className="w-full"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`Application trend showing ${days.reduce((sum, day) => sum + day.applications, 0)} applications across ${days.length} days`}
        >
            {[0, 1, 2, 3, 4].map((value) => {
                const y = top + innerH - (value * innerH) / 4;

                return (
                    <g key={value}>
                        <line
                            x1={left}
                            y1={y}
                            x2={width - right}
                            y2={y}
                            style={{ stroke: 'var(--line)' }}
                        />
                        <text
                            x={left - 9}
                            y={y + 3}
                            textAnchor="end"
                            style={{
                                fill: 'var(--slate)',
                                fontSize: 10,
                            }}
                        >
                            {Math.round((max * value) / 4)}
                        </text>
                    </g>
                );
            })}
            {days.length > 0 && (
                <>
                    <path
                        d={fill}
                        style={{ fill: 'var(--teal)', opacity: 0.12 }}
                    />
                    <path
                        d={line}
                        fill="none"
                        style={{
                            stroke: 'var(--teal)',
                            strokeWidth: 2,
                        }}
                    />
                    {coords.map((point, index) => (
                        <circle
                            key={index}
                            cx={point.x}
                            cy={point.y}
                            r={3}
                            style={{ fill: 'var(--teal)' }}
                        />
                    ))}
                </>
            )}
            {labels.map((day) => {
                const index = days.indexOf(day);
                const x =
                    left +
                    (days.length <= 1
                        ? innerW / 2
                        : (index * innerW) / (days.length - 1));

                return (
                    <text
                        key={day.date}
                        x={x}
                        y={height - 7}
                        textAnchor="middle"
                        style={{ fill: 'var(--slate)', fontSize: 10 }}
                    >
                        {formatShortDate(day.date)}
                    </text>
                );
            })}
        </svg>
    );
}
