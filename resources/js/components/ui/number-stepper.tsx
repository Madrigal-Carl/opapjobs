import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type NumberStepperProps = Omit<
    ComponentProps<'input'>,
    'value' | 'onChange' | 'min' | 'max'
> & {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    'data-field'?: string;
    'data-testid': string;
};

/** Joined decrement, numeric input, and increment control for vacancy counts. */
export function NumberStepper({
    value,
    onChange,
    min = 1,
    max,
    'data-testid': testId,
    ...props
}: NumberStepperProps) {
    return (
        <div className="flex h-9 w-fit rounded-md border border-[var(--line)] bg-white focus-within:ring-2 focus-within:ring-[var(--teal)]/40">
            <Button
                type="button"
                variant="ghost"
                className="h-full w-9 rounded-r-none border-r border-[var(--line)] p-0"
                disabled={value <= min}
                onClick={() =>
                    onChange(
                        Math.max(
                            min,
                            (Number.isFinite(value) ? value : min) - 1,
                        ),
                    )
                }
                aria-label="Decrease vacant positions"
                data-testid={`${testId}-decrease`}
            >
                −
            </Button>
            <Input
                {...props}
                type="text"
                inputMode="numeric"
                value={Number.isFinite(value) ? value : ''}
                onChange={(event) =>
                    onChange(
                        event.target.value.trim()
                            ? Number(event.target.value)
                            : Number.NaN,
                    )
                }
                className="h-full w-24 rounded-none border-0 px-2 py-0 text-center text-sm font-semibold text-[var(--navy)] focus:ring-0"
                data-testid={testId}
            />
            <Button
                type="button"
                variant="ghost"
                className="h-full w-9 rounded-l-none border-l border-[var(--line)] p-0"
                disabled={max !== undefined && value >= max}
                onClick={() =>
                    onChange(
                        Math.min(
                            max ?? Infinity,
                            (Number.isFinite(value) ? value : min - 1) + 1,
                        ),
                    )
                }
                aria-label="Increase vacant positions"
                data-testid={`${testId}-increase`}
            >
                +
            </Button>
        </div>
    );
}
