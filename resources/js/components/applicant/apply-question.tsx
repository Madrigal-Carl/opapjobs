import { useLayoutEffect, useRef } from 'react';
import { ApplyTag } from '@/components/applicant/apply-field';
import { FieldError } from '@/components/applicant/match-blocks';
import { Textarea } from '@/components/ui/textarea';
import { YES_NO_OPTIONS } from '@/data/application-questions';
import type { ApplicationAnswer } from '@/types/application-draft';
import type { JobQuestion } from '@/types/job';

export function ApplyQuestion({
    question,
    answer,
    invalid = false,
    onAnswer,
}: {
    question: JobQuestion;
    number: number;
    answer?: ApplicationAnswer;
    invalid?: boolean;
    onAnswer: (questionId: string, value: ApplicationAnswer) => void;
}) {
    const value = typeof answer === 'string' ? answer : '';
    const answered = Boolean(value.trim());
    const id = `question-${question.id}`;
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        const textarea = textareaRef.current;

        if (!textarea) {
            return;
        }

        const resize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        };

        resize();
        let width = textarea.clientWidth;
        let frame = 0;
        const observer = new ResizeObserver(() => {
            if (textarea.clientWidth !== width) {
                width = textarea.clientWidth;
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(resize);
            }
        });

        observer.observe(textarea);

        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [value]);

    const errorId = invalid ? `${id}-error` : undefined;

    return (
        <div
            id={question.type === 'yesno' ? id : `${id}-block`}
            className={`apply-question ${answered ? 'is-answered' : ''} ${invalid ? 'is-invalid' : ''}`}
            data-testid={`question-block-${question.id}`}
        >
            <label
                className="apply-question-label"
                id={`${id}-label`}
                htmlFor={question.type === 'yesno' ? undefined : id}
            >
                {question.label}
                <ApplyTag required={question.required} />
            </label>
            {question.type === 'yesno' ? (
                <div
                    className="apply-yesno"
                    role="radiogroup"
                    aria-labelledby={`${id}-label`}
                    aria-required={question.required || undefined}
                    aria-invalid={invalid || undefined}
                    aria-describedby={errorId}
                >
                    {YES_NO_OPTIONS.map((option) => (
                        <label key={option} className="apply-choice">
                            <input
                                type="radio"
                                name={id}
                                value={option}
                                checked={value === option}
                                aria-invalid={invalid || undefined}
                                aria-describedby={errorId}
                                onChange={() => onAnswer(question.id, option)}
                                data-testid={`button-answer-${question.id}-${option.toLowerCase()}`}
                            />
                            {option}
                        </label>
                    ))}
                </div>
            ) : question.type === 'short' ? (
                <input
                    id={id}
                    type="text"
                    className="field-control"
                    value={value}
                    aria-required={question.required || undefined}
                    aria-invalid={invalid || undefined}
                    aria-describedby={errorId}
                    placeholder="Your answer"
                    onChange={(event) =>
                        onAnswer(question.id, event.target.value)
                    }
                    data-testid={`input-answer-${question.id}`}
                />
            ) : (
                <>
                    <Textarea
                        ref={textareaRef}
                        id={id}
                        className="field-control apply-autogrow"
                        rows={3}
                        value={value}
                        aria-required={question.required || undefined}
                        aria-invalid={invalid || undefined}
                        aria-describedby={[errorId, `${id}-count`]
                            .filter(Boolean)
                            .join(' ')}
                        placeholder="Your answer"
                        onChange={(event) =>
                            onAnswer(question.id, event.target.value)
                        }
                        data-testid={`input-answer-${question.id}`}
                    />
                    <p id={`${id}-count`} className="apply-character-count">
                        {value.length.toLocaleString()} characters
                    </p>
                </>
            )}
            {invalid && (
                <div id={errorId}>
                    <FieldError>
                        Answer this required question before continuing.
                    </FieldError>
                </div>
            )}
        </div>
    );
}
