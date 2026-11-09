import type { QuestionAnswerType } from '@/types/job';

export type QuestionAnswerTypeOption = {
    value: QuestionAnswerType;
    label: string;
    placeholder: string;
};

/**
 * The answer types an admin can choose from when writing a
 * custom question for a job listing.
 */
export const QUESTION_ANSWER_TYPES: QuestionAnswerTypeOption[] = [
    {
        value: 'yesno',
        label: 'Answerable by yes/no',
        placeholder: 'Choose yes or no',
    },
    {
        value: 'short',
        label: 'Short answer',
        placeholder: 'Short answer goes here',
    },
    {
        value: 'selection',
        label: 'Selection',
        placeholder: 'Select one answer',
    },
    {
        value: 'number',
        label: 'Number',
        placeholder: 'Enter a number',
    },
    {
        value: 'paragraph',
        label: 'Show paragraph',
        placeholder: 'Let the applicant explain in their own words…',
    },
];

export function getQuestionAnswerType(
    value: QuestionAnswerType,
): QuestionAnswerTypeOption {
    return (
        QUESTION_ANSWER_TYPES.find((option) => option.value === value) ??
        QUESTION_ANSWER_TYPES[0]
    );
}
