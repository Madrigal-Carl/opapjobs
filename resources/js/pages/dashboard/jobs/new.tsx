import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { addJob } from '@/data/job-store';
import { jobs } from '@/routes/dashboard';
import { create as jobsCreate } from '@/routes/dashboard/jobs';
import type { Pathway } from '@/types/agency';
import type { Job, QuestionAnswerType } from '@/types/job';
import { QUESTION_ANSWER_TYPES } from '@/data/job-questions';
import { DashboardPage } from '@/components/dashboard/page';

type QuestionDraft = {
    id: string;
    label: string;
    type: QuestionAnswerType;
    answer: string;
};

type JobForm = {
    title: string;
    employer: string;
    agency: string;
    pathway: Pathway;
    location: string;
    salary: string;
    featured: boolean;
    urgent: boolean;
    questions: QuestionDraft[];
};

const emptyForm: JobForm = {
    title: '',
    employer: '',
    agency: '',
    pathway: 'landbased',
    location: '',
    salary: '',
    featured: false,
    urgent: false,
    questions: [
        {
            id: 'question-1',
            label: 'Are you willing to relocate for this role?',
            type: 'yesno',
            answer: '',
        },
    ],
};

export default function DashboardNewJob() {
    const [form, setForm] = useState<JobForm>(emptyForm);
    const [error, setError] = useState('');

    const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const title = form.title.trim();
        const employer = form.employer.trim();
        const agency = form.agency.trim();
        const location = form.location.trim();

        if (!title || !employer || !agency || !location) {
            setError(
                'Please complete the job title, employer, agency and location.',
            );
            return;
        }

        const job: Job = {
            id: `job-${Date.now()}`,
            title,
            employer,
            agency,
            pathway: form.pathway,
            location,
            salary: form.salary.trim() || 'Competitive salary',
            posted: 'Just now',
            featured: form.featured,
            urgent: form.urgent,
            recent: true,
            questions: form.questions
                .map((question) => ({
                    id: question.id,
                    label: question.label.trim(),
                    type: question.type,
                    answer: question.answer.trim(),
                }))
                .filter((question) => question.label !== ''),
        };

        addJob(job);
        setForm(emptyForm);
        setError('');

        toast.success('Job listing published.');
    };

    return (
        <>
            <Head title="Post a new job" />

            <DashboardPage>
                <DashboardPageHeader
                    title="Post a new job"
                    subtitle="Create a clear, applicant-focused listing for your next placement."
                    actions={
                        <Button variant="secondary" size="sm" asChild>
                            <Link href={jobs()}>
                                <ArrowLeft aria-hidden="true" />
                                Back to jobs
                            </Link>
                        </Button>
                    }
                />

                <Card>
                    <CardContent className="flex flex-col gap-4 pt-6">
                        <form
                            onSubmit={submitForm}
                            className="flex flex-col gap-4"
                            data-testid="form-new-job"
                        >
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="job-title">Job title *</Label>
                                <Input
                                    id="job-title"
                                    required
                                    value={form.title}
                                    onChange={(event) => {
                                        setForm({
                                            ...form,
                                            title: event.target.value,
                                        });
                                        setError('');
                                    }}
                                    placeholder="e.g. Registered Nurse"
                                    data-testid="input-job-title"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="job-employer">
                                        Employer *
                                    </Label>
                                    <Input
                                        id="job-employer"
                                        required
                                        value={form.employer}
                                        onChange={(event) => {
                                            setForm({
                                                ...form,
                                                employer: event.target.value,
                                            });
                                            setError('');
                                        }}
                                        placeholder="e.g. NMC Healthcare"
                                        data-testid="input-job-employer"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="job-agency">
                                        Recruitment agency *
                                    </Label>
                                    <Input
                                        id="job-agency"
                                        required
                                        value={form.agency}
                                        onChange={(event) => {
                                            setForm({
                                                ...form,
                                                agency: event.target.value,
                                            });
                                            setError('');
                                        }}
                                        placeholder="e.g. Magsaysay Global Services"
                                        data-testid="input-job-agency"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="job-pathway">
                                        Pathway *
                                    </Label>
                                    <Select
                                        value={form.pathway}
                                        onValueChange={(value) =>
                                            setForm({
                                                ...form,
                                                pathway: value as Pathway,
                                            })
                                        }
                                    >
                                        <SelectTrigger
                                            id="job-pathway"
                                            aria-label="Listing pathway"
                                            data-testid="select-job-pathway-new"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="landbased">
                                                Landbased
                                            </SelectItem>
                                            <SelectItem value="seabased">
                                                Seabased
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="job-location">
                                        Destination *
                                    </Label>
                                    <Input
                                        id="job-location"
                                        required
                                        value={form.location}
                                        onChange={(event) => {
                                            setForm({
                                                ...form,
                                                location: event.target.value,
                                            });
                                            setError('');
                                        }}
                                        placeholder="City, country"
                                        data-testid="input-job-location"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="job-salary">Salary range</Label>
                                <Input
                                    id="job-salary"
                                    value={form.salary}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            salary: event.target.value,
                                        })
                                    }
                                    placeholder="e.g. QAR 3,200–4,100"
                                    data-testid="input-job-salary"
                                />
                            </div>
                            <div className="flex flex-col gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
                                <div>
                                    <span className="text-sm font-semibold text-[var(--navy)]">
                                        Listing flags
                                    </span>
                                    <p className="text-xs text-[var(--slate)]">
                                        Flags are optional. They add a badge to
                                        the listing so it stands out on the Jobs
                                        page.
                                    </p>
                                </div>
                                <label
                                    htmlFor="job-featured"
                                    className="flex cursor-pointer items-center gap-2 text-sm text-[var(--navy)]"
                                >
                                    <Checkbox
                                        id="job-featured"
                                        checked={form.featured}
                                        onCheckedChange={(checked) =>
                                            setForm({
                                                ...form,
                                                featured: checked === true,
                                            })
                                        }
                                        data-testid="checkbox-job-featured"
                                    />
                                    Featured — show a
                                    <span className="font-medium">
                                        Featured
                                    </span>{' '}
                                    badge
                                </label>
                                <label
                                    htmlFor="job-urgent"
                                    className="flex cursor-pointer items-center gap-2 text-sm text-[var(--navy)]"
                                >
                                    <Checkbox
                                        id="job-urgent"
                                        checked={form.urgent}
                                        onCheckedChange={(checked) =>
                                            setForm({
                                                ...form,
                                                urgent: checked === true,
                                            })
                                        }
                                        data-testid="checkbox-job-urgent"
                                    />
                                    Urgent — show an
                                    <span className="font-medium">
                                        Urgent
                                    </span>{' '}
                                    badge
                                </label>
                                {(form.featured || form.urgent) && (
                                    <p
                                        className="text-xs text-[var(--teal)]"
                                        role="status"
                                        data-testid="status-job-flags"
                                    >
                                        Flags saved:{' '}
                                        {[
                                            form.featured ? 'Featured' : null,
                                            form.urgent ? 'Urgent' : null,
                                        ]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 rounded-lg border border-[var(--line)] bg-white px-4 py-3">
                                <div>
                                    <span className="text-sm font-semibold text-[var(--navy)]">
                                        Custom questions
                                    </span>
                                    <p className="text-xs text-[var(--slate)]">
                                        Ask applicants anything you need. Choose
                                        the answer type first — yes/no, a short
                                        answer, or a paragraph — then leave the
                                        answer blank to skip the question.
                                    </p>
                                </div>
                                {form.questions.map((question, index) => (
                                    <div
                                        key={question.id}
                                        className="flex flex-col gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-3"
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={question.label}
                                                onChange={(event) => {
                                                    const next = [
                                                        ...form.questions,
                                                    ];

                                                    next[index] = {
                                                        ...question,
                                                        label: event.target
                                                            .value,
                                                    };
                                                    setForm({
                                                        ...form,
                                                        questions: next,
                                                    });
                                                }}
                                                placeholder="e.g. Are you willing to relocate?"
                                                aria-label={`Custom question ${index + 1}`}
                                                className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                                                data-testid={`input-question-label-${index}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setForm({
                                                        ...form,
                                                        questions:
                                                            form.questions.filter(
                                                                (item) =>
                                                                    item.id !==
                                                                    question.id,
                                                            ),
                                                    })
                                                }
                                                aria-label={`Remove custom question ${index + 1}`}
                                                className="rounded-md p-2 text-[var(--slate)] transition-colors hover:bg-[var(--surface-soft)] hover:text-destructive focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                                                data-testid={`button-remove-question-${index}`}
                                            >
                                                <Trash2
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        </div>
                                        <Select
                                            value={question.type}
                                            onValueChange={(value) => {
                                                const next = [
                                                    ...form.questions,
                                                ];

                                                next[index] = {
                                                    ...question,
                                                    type: value as QuestionAnswerType,
                                                    answer: '',
                                                };
                                                setForm({
                                                    ...form,
                                                    questions: next,
                                                });
                                            }}
                                        >
                                            <SelectTrigger
                                                className="w-full bg-white"
                                                aria-label={`Answer type for ${question.label || `question ${index + 1}`}`}
                                                data-testid={`select-question-type-${index}`}
                                            >
                                                <SelectValue placeholder="Choose an answer type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {QUESTION_ANSWER_TYPES.map(
                                                    (option) => (
                                                        <SelectItem
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {question.type === 'yesno' ? (
                                            <Select
                                                value={question.answer}
                                                onValueChange={(value) => {
                                                    const next = [
                                                        ...form.questions,
                                                    ];

                                                    next[index] = {
                                                        ...question,
                                                        answer: value,
                                                    };
                                                    setForm({
                                                        ...form,
                                                        questions: next,
                                                    });
                                                }}
                                            >
                                                <SelectTrigger
                                                    className="w-full bg-white"
                                                    aria-label={`Answer for ${question.label || `question ${index + 1}`}`}
                                                    data-testid={`select-question-answer-${index}`}
                                                >
                                                    <SelectValue placeholder="Choose an answer" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Yes">
                                                        Yes
                                                    </SelectItem>
                                                    <SelectItem value="No">
                                                        No
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : question.type === 'short' ? (
                                            <input
                                                type="text"
                                                value={question.answer}
                                                onChange={(event) => {
                                                    const next = [
                                                        ...form.questions,
                                                    ];

                                                    next[index] = {
                                                        ...question,
                                                        answer: event.target
                                                            .value,
                                                    };
                                                    setForm({
                                                        ...form,
                                                        questions: next,
                                                    });
                                                }}
                                                placeholder="Short answer goes here"
                                                aria-label={`Answer for ${question.label || `question ${index + 1}`}`}
                                                className="min-w-0 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                                                data-testid={`input-question-answer-${index}`}
                                            />
                                        ) : (
                                            <textarea
                                                rows={3}
                                                value={question.answer}
                                                onChange={(event) => {
                                                    const next = [
                                                        ...form.questions,
                                                    ];

                                                    next[index] = {
                                                        ...question,
                                                        answer: event.target
                                                            .value,
                                                    };
                                                    setForm({
                                                        ...form,
                                                        questions: next,
                                                    });
                                                }}
                                                placeholder="Let the applicant explain in their own words…"
                                                aria-label={`Answer for ${question.label || `question ${index + 1}`}`}
                                                className="min-w-0 resize-y rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                                                data-testid={`textarea-question-answer-${index}`}
                                            />
                                        )}
                                    </div>
                                ))}
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    type="button"
                                    onClick={() =>
                                        setForm({
                                            ...form,
                                            questions: [
                                                ...form.questions,
                                                {
                                                    id: `question-${Date.now()}`,
                                                    label: '',
                                                    type: 'yesno',
                                                    answer: '',
                                                },
                                            ],
                                        })
                                    }
                                    className="self-start"
                                    data-testid="button-add-question"
                                >
                                    <Plus aria-hidden="true" />
                                    Add question
                                </Button>
                            </div>
                            {error && (
                                <p
                                    className="text-sm font-medium text-destructive"
                                    role="alert"
                                >
                                    {error}
                                </p>
                            )}
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <Button variant="secondary" asChild>
                                    <Link href={jobs()}>Cancel</Link>
                                </Button>
                                <Button
                                    type="submit"
                                    data-testid="button-publish-job"
                                >
                                    Publish listing
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </DashboardPage>
        </>
    );
}

DashboardNewJob.layout = {
    breadcrumbs: [
        {
            title: 'Jobs',
            href: jobs(),
        },
        {
            title: 'Post a new job',
            href: jobsCreate(),
        },
    ],
};
