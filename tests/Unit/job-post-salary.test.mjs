import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatJobPostSalary } from '../../resources/js/lib/job-post-salary.ts';

for (const [name, minimum, maximum, amount, period] of [
    ['range', '2500.00', '3200.00', 'SAR 2,500–3,200', 'mo'],
    ['minimum only', '2500.00', null, 'SAR 2,500+', 'mo'],
    ['maximum only', null, '3200.00', 'Up to SAR 3,200', 'mo'],
    ['equal bounds', '2500.00', '2500.00', 'SAR 2,500', 'mo'],
    ['zero minimum', '0.00', '500.50', 'SAR 0–500.5', 'mo'],
    ['no bounds', null, null, 'Competitive salary', null],
]) {
    await test(`job post salary: ${name}`, () => {
        assert.deepEqual(
            formatJobPostSalary({
                salary_currency: 'SAR',
                monthly_salary_min: minimum,
                monthly_salary_max: maximum,
            }),
            { amount, period },
        );
    });
}

await test('job post salary without a currency has no empty prefix', () => {
    assert.deepEqual(
        formatJobPostSalary({
            salary_currency: null,
            monthly_salary_min: '1200.00',
            monthly_salary_max: null,
        }),
        { amount: '1,200+', period: 'mo' },
    );
});
