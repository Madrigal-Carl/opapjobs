export type ResolvedAppearance = 'light';
export type Appearance = 'light';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
};

export function useAppearance(): UseAppearanceReturn {
    return { appearance: 'light', resolvedAppearance: 'light' } as const;
}
