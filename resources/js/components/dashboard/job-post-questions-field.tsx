import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    useFieldArray,
    useWatch,
    type Control,
    type FieldErrors,
    type UseFormRegister,
    type UseFormSetValue,
} from 'react-hook-form';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    copyQuestion,
    questionMoveTarget,
    type JobForm,
    type JobFormOptions,
} from '@/data/job-form';

const answerLabels = {
    yesno: 'Yes / No',
    short: 'Short answer',
    paragraph: 'Paragraph',
};

export function JobPostQuestionsField({
    control,
    register,
    setValue,
    errors,
    options,
}: {
    control: Control<JobForm>;
    register: UseFormRegister<JobForm>;
    setValue: UseFormSetValue<JobForm>;
    errors: FieldErrors<JobForm>;
    options: JobFormOptions['answer_types'];
}) {
    const { fields, append, insert, move, remove } = useFieldArray({
        control,
        name: 'questions',
    });
    const questions = useWatch({ control, name: 'questions' });
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [announcement, setAnnouncement] = useState('');
    const announce = (message: string) => {
        setAnnouncement('');
        requestAnimationFrame(() => setAnnouncement(message));
    };
    const focusQuestion = (index: number) =>
        requestAnimationFrame(() => {
            const input = document.querySelector<HTMLInputElement>(
                `[data-testid="input-question-label-${index}"]`,
            );
            input?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            input?.focus({ preventScroll: true });
        });

    return (
        <div
            className="flex flex-col gap-3"
            data-field="questions"
            tabIndex={-1}
            aria-invalid={Boolean(
                errors.questions?.root?.message ?? errors.questions?.message,
            )}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-xs font-semibold text-[var(--navy)]">
                        Custom questions
                    </p>
                    <p className="mt-1 text-xs text-[var(--slate)]">
                        Choose an answer type, then provide question details.
                    </p>
                </div>
                <span
                    className="text-xs text-[var(--slate)]"
                    data-testid="question-count"
                >
                    {fields.length} of 20 questions
                </span>
                {fields.length > 5 && (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        data-testid="button-toggle-all-questions"
                        onClick={() =>
                            setCollapsed(
                                collapsed.size
                                    ? new Set()
                                    : new Set(fields.map((field) => field.id)),
                            )
                        }
                    >
                        {collapsed.size ? 'Expand all' : 'Collapse all'}
                    </Button>
                )}
            </div>
            {fields.length === 0 && (
                <p className="rounded-lg border border-dashed border-[var(--line)] p-4 text-sm text-[var(--slate)]">
                    No screening questions yet. Add one to pre-screen
                    applicants.
                </p>
            )}
            <InputError
                role="alert"
                message={
                    errors.questions?.root?.message ?? errors.questions?.message
                }
            />
            {fields.map((field, index) => {
                const question = questions[index] ?? field;
                const error = errors.questions?.[index];
                const hidden = collapsed.has(field.id) && !error;
                const errorProps = (
                    name: 'label' | 'type' | 'answer' | 'required',
                ) => ({
                    'aria-invalid': Boolean(error?.[name]),
                    'aria-describedby': error?.[name]
                        ? `question-${index}-${name}-error`
                        : undefined,
                    'data-field': `questions.${index}.${name}`,
                });
                return (
                    <section
                        key={field.id}
                        className="flex flex-col gap-3 rounded-lg border border-[var(--line)] bg-white p-3"
                        aria-label={`Question ${index + 1}`}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto min-w-0 flex-1 justify-start px-1 text-left"
                                aria-expanded={!hidden}
                                data-testid={`button-toggle-question-${index}`}
                                onClick={() =>
                                    setCollapsed((current) => {
                                        const next = new Set(current);
                                        if (next.has(field.id))
                                            next.delete(field.id);
                                        else next.add(field.id);
                                        return next;
                                    })
                                }
                            >
                                <span className="truncate">
                                    Question {index + 1}
                                    {hidden
                                        ? `: ${question.label || 'Untitled'} · ${answerLabels[question.type]}${question.required ? ' · Required' : ''}`
                                        : ''}
                                </span>
                            </Button>
                            <div className="flex items-center gap-1">
                                {([-1, 1] as const).map((direction) => (
                                    <Button
                                        key={direction}
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        disabled={
                                            questionMoveTarget(
                                                index,
                                                direction,
                                                fields.length,
                                            ) === null
                                        }
                                        aria-label={`Move question ${index + 1} ${direction === -1 ? 'up' : 'down'}`}
                                        data-testid={`button-move-question-${direction === -1 ? 'up' : 'down'}-${index}`}
                                        onClick={() => {
                                            const target = questionMoveTarget(
                                                index,
                                                direction,
                                                fields.length,
                                            );
                                            if (target !== null) {
                                                move(index, target);
                                                announce(
                                                    `Question ${index + 1} moved to position ${target + 1}`,
                                                );
                                            }
                                        }}
                                    >
                                        {direction === -1 ? (
                                            <ArrowUp
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <ArrowDown
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </Button>
                                ))}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    disabled={fields.length >= 20}
                                    aria-label={`Duplicate question ${index + 1}`}
                                    data-testid={`button-duplicate-question-${index}`}
                                    onClick={() => {
                                        insert(
                                            index + 1,
                                            copyQuestion(question),
                                        );
                                        announce('Question added');
                                        focusQuestion(index + 1);
                                    }}
                                >
                                    <Copy
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-destructive"
                                    aria-label={`Remove question ${index + 1}`}
                                    data-testid={`button-remove-question-${index}`}
                                    onClick={() => {
                                        remove(index);
                                        announce('Question removed');
                                    }}
                                >
                                    <Trash2
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </Button>
                            </div>
                        </div>
                        <div hidden={hidden} className="space-y-3">
                            <div className="space-y-1.5">
                                <Label htmlFor={`question-${index}-label`}>
                                    Question text
                                </Label>
                                <Input
                                    id={`question-${index}-label`}
                                    {...register(`questions.${index}.label`)}
                                    {...errorProps('label')}
                                    placeholder="Enter your question"
                                    data-testid={`input-question-label-${index}`}
                                />
                                <InputError
                                    id={`question-${index}-label-error`}
                                    role="alert"
                                    message={error?.label?.message}
                                />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor={`question-${index}-type`}>
                                        Answer type
                                    </Label>
                                    <Select
                                        value={question.type}
                                        onValueChange={(value) => {
                                            setValue(
                                                `questions.${index}.type`,
                                                value as JobForm['questions'][number]['type'],
                                                { shouldDirty: true },
                                            );
                                            setValue(
                                                `questions.${index}.answer`,
                                                '',
                                                {
                                                    shouldDirty: true,
                                                    shouldValidate: true,
                                                },
                                            );
                                        }}
                                    >
                                        <SelectTrigger
                                            id={`question-${index}-type`}
                                            {...errorProps('type')}
                                            className="w-full"
                                            data-testid={`select-question-type-${index}`}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {options.map((type) => (
                                                <SelectItem
                                                    key={type}
                                                    value={type}
                                                    data-testid={`question-type-${index}-${type}`}
                                                >
                                                    {answerLabels[type]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        id={`question-${index}-type-error`}
                                        role="alert"
                                        message={error?.type?.message}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor={`question-${index}-answer`}>
                                        Expected answer
                                    </Label>
                                    {question.type === 'yesno' ? (
                                        <Select
                                            value={question.answer || 'none'}
                                            onValueChange={(value) =>
                                                setValue(
                                                    `questions.${index}.answer`,
                                                    value === 'none'
                                                        ? ''
                                                        : value,
                                                    {
                                                        shouldDirty: true,
                                                        shouldValidate: true,
                                                    },
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id={`question-${index}-answer`}
                                                {...errorProps('answer')}
                                                className="w-full"
                                                data-testid={`select-question-answer-${index}`}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[
                                                    ['none', 'No preference'],
                                                    ['yes', 'Yes'],
                                                    ['no', 'No'],
                                                ].map(([value, label]) => (
                                                    <SelectItem
                                                        key={value}
                                                        value={value}
                                                        data-testid={`question-answer-${index}-${label}`}
                                                    >
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : question.type === 'short' ? (
                                        <Input
                                            id={`question-${index}-answer`}
                                            {...register(
                                                `questions.${index}.answer`,
                                            )}
                                            {...errorProps('answer')}
                                            data-testid={`input-question-answer-${index}`}
                                            placeholder="Short answer goes here"
                                        />
                                    ) : (
                                        <Textarea
                                            id={`question-${index}-answer`}
                                            rows={3}
                                            {...register(
                                                `questions.${index}.answer`,
                                            )}
                                            {...errorProps('answer')}
                                            data-testid={`textarea-question-answer-${index}`}
                                            placeholder="Let the applicant explain in their own words…"
                                        />
                                    )}
                                    <InputError
                                        id={`question-${index}-answer-error`}
                                        role="alert"
                                        message={error?.answer?.message}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id={`question-${index}-required`}
                                    checked={question.required}
                                    {...errorProps('required')}
                                    data-testid={`checkbox-question-required-${index}`}
                                    onCheckedChange={(checked) =>
                                        setValue(
                                            `questions.${index}.required`,
                                            checked === true,
                                            { shouldDirty: true },
                                        )
                                    }
                                />
                                <Label htmlFor={`question-${index}-required`}>
                                    Applicants must answer this
                                </Label>
                                <InputError
                                    id={`question-${index}-required-error`}
                                    role="alert"
                                    message={error?.required?.message}
                                />
                            </div>
                        </div>
                    </section>
                );
            })}
            <Button
                type="button"
                variant="secondary"
                size="sm"
                className="self-start"
                disabled={fields.length >= 20}
                data-testid="button-add-question"
                onClick={() => {
                    append({
                        label: '',
                        type: options[0],
                        answer: '',
                        required: false,
                    });
                    announce('Question added');
                    focusQuestion(fields.length);
                }}
            >
                <Plus className="size-4" aria-hidden="true" />
                Add question
            </Button>
            {fields.length >= 20 && (
                <p className="text-xs text-[var(--slate)]">
                    Limit reached. Remove a question to add another.
                </p>
            )}
            <p className="sr-only" aria-live="polite" aria-atomic="true">
                {announcement}
            </p>
        </div>
    );
}
