import { Check } from 'lucide-react';
import { APPLICATION_STEPS } from '@/types/application-draft';

/**
 * The three-stage progress marker above the apply wizard. Read-only: steps
 * are reached with Back/Continue rather than by clicking ahead, so a skipped
 * step can never be submitted empty.
 */
export function ApplicationStepper({ currentStep }: { currentStep: number }) {
    return (
        <ol
            className="flex items-center justify-center gap-2 sm:gap-4"
            aria-label="Application progress"
        >
            {APPLICATION_STEPS.map((label, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === currentStep;
                const isComplete = stepNumber < currentStep;

                return (
                    <li
                        key={label}
                        className={`flex items-center gap-2 sm:gap-4 ${
                            isActive || isComplete
                                ? 'text-[var(--navy)]'
                                : 'text-[var(--slate)]'
                        }`}
                        aria-current={isActive ? 'step' : undefined}
                        data-testid={`stepper-step-${stepNumber}`}
                    >
                        <span className="flex items-center gap-2">
                            <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition ${
                                    isComplete
                                        ? 'border-[var(--teal)] bg-[var(--teal)] text-white'
                                        : isActive
                                          ? 'border-[var(--amber)] bg-[var(--amber)] text-[var(--navy-deep)]'
                                          : 'border-[var(--line)] bg-white text-[var(--slate)]'
                                }`}
                            >
                                {isComplete ? (
                                    <Check size={13} aria-hidden="true" />
                                ) : (
                                    stepNumber
                                )}
                            </span>
                            <span className="hidden font-mono text-[10px] tracking-[0.08em] uppercase sm:inline">
                                {label}
                            </span>
                        </span>
                        {stepNumber < APPLICATION_STEPS.length && (
                            <span
                                className={`h-px w-4 sm:w-10 ${
                                    isComplete
                                        ? 'bg-[var(--teal)]'
                                        : 'bg-[var(--line)]'
                                }`}
                                aria-hidden="true"
                            />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
