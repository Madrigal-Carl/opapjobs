export function elapsedSince(dateValue: string): string {
    const start = new Date(`${dateValue}T00:00:00`);
    const now = new Date();
    const days = Number.isFinite(start.getTime())
        ? Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000))
        : 0;

    if (days === 0) {
        return 'Applied today';
    }

    if (days === 1) {
        return 'Applied 1 day ago';
    }

    return `Applied ${days} days ago`;
}
