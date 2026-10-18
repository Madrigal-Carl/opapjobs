import type { JobPostRow } from '@/types/job-post';

const salaryNumber = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
});

export function formatJobPostSalary(
    post: Pick<
        JobPostRow,
        'salary_currency' | 'monthly_salary_min' | 'monthly_salary_max'
    >,
): { amount: string; period: 'mo' | null } {
    const {
        salary_currency: currency,
        monthly_salary_min: min,
        monthly_salary_max: max,
    } = post;

    if (min === null && max === null) {
        return { amount: 'Competitive salary', period: null };
    }

    const prefix = currency ? `${currency} ` : '';
    const minimum = min === null ? null : salaryNumber.format(Number(min));
    const maximum = max === null ? null : salaryNumber.format(Number(max));
    let amount: string;

    if (minimum !== null && maximum !== null) {
        amount = `${prefix}${minimum}${minimum === maximum ? '' : `–${maximum}`}`;
    } else if (minimum !== null) {
        amount = `${prefix}${minimum}+`;
    } else {
        amount = `Up to ${prefix}${maximum}`;
    }

    return { amount, period: 'mo' };
}
