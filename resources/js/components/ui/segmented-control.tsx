import * as ToggleGroup from '@radix-ui/react-toggle-group';

type SegmentedControlProps<T extends string> = {
    value: T;
    onValueChange: (value: T) => void;
    options: { value: T; label: string }[];
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'data-testid': string;
};

/** A single-choice segmented field that always keeps one option selected. */
export function SegmentedControl<T extends string>({
    value,
    onValueChange,
    options,
    'data-testid': testId,
    ...props
}: SegmentedControlProps<T>) {
    return (
        <ToggleGroup.Root
            type="single"
            value={value}
            onValueChange={(next) => {
                if (next) {
                    onValueChange(next as T);
                }
            }}
            className="inline-flex w-fit max-w-full rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-0.5"
            data-testid={testId}
            {...props}
        >
            {options.map((option) => (
                <ToggleGroup.Item
                    key={option.value}
                    value={option.value}
                    className="h-8 rounded-md px-3 text-xs font-medium whitespace-nowrap text-[var(--slate)] outline-none hover:text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 data-[state=on]:bg-[var(--amber)] data-[state=on]:font-bold data-[state=on]:text-[var(--navy)]"
                    data-testid={`${testId}-${option.value}`}
                >
                    {option.label}
                </ToggleGroup.Item>
            ))}
        </ToggleGroup.Root>
    );
}
