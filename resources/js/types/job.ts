import type { Pathway } from './agency';

export type QuestionAnswerType = 'yesno' | 'short' | 'paragraph';

export type JobQuestion = {
    id: string;
    label: string;
    type: QuestionAnswerType;
    answer: string;
};

export type Job = {
    id: string;
    title: string;
    employer: string;
    agency: string;
    pathway: Pathway;
    location: string;
    salary: string;
    posted: string;
    featured?: boolean;
    urgent?: boolean;
    recent?: boolean;
    questions?: JobQuestion[];
};
