export function getNameInitials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return '?';
    }

    const firstInitial = Array.from(parts[0])[0] ?? '';
    const lastInitial =
        parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? '') : '';

    return `${firstInitial}${lastInitial}`.toUpperCase();
}
