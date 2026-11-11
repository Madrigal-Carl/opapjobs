import { z } from 'zod';
import type { Account } from '@/types/account';

export const STAFF_NOTES_MAX = 1000;

/** Mirrors the backend `phone` rule in AccountFormRequest. */
const PHONE_PATTERN = /^\+?[0-9\s().-]{7,32}$/;
/** A dial code alone ("+966") means the number was left blank. */
const DIAL_CODE_ONLY = /^\+\d{1,4}$/;

/** Strips a lone dial code so an untouched phone field counts as empty. */
export function normalizeStaffPhone(phone: string): string {
    const trimmed = phone.trim();

    return DIAL_CODE_ONLY.test(trimmed) ? '' : trimmed;
}

/**
 * Client-side rules for the add / edit staff account dialog. Messages match
 * AccountFormRequest::messages() so both layers read the same.
 */
export const staffAccountFormSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Enter the staff member’s full name.')
        .max(255, 'Keep the name to 255 characters or fewer.'),
    email: z
        .string()
        .trim()
        .min(1, 'Enter a work email.')
        .max(255, 'Keep the email to 255 characters or fewer.')
        .refine(
            (value) => value === '' || z.email().safeParse(value).success,
            'Enter a valid email address.',
        ),
    phone: z.string().refine((value) => {
        const phone = normalizeStaffPhone(value);

        return phone === '' || PHONE_PATTERN.test(phone);
    }, 'Enter a valid mobile number.'),
    notes: z
        .string()
        .max(STAFF_NOTES_MAX, 'Keep notes to 1,000 characters or fewer.'),
});

export type StaffAccountForm = z.infer<typeof staffAccountFormSchema>;

export const emptyStaffAccountForm: StaffAccountForm = {
    name: '',
    email: '',
    phone: '',
    notes: '',
};

export function staffAccountFormFromAccount(
    account: Account,
): StaffAccountForm {
    return {
        name: account.fullName,
        email: account.email,
        phone: account.phone ?? '',
        notes: account.notes ?? '',
    };
}

export function toStaffAccountPayload(form: StaffAccountForm) {
    return {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: normalizeStaffPhone(form.phone) || null,
        notes: form.notes.trim() || null,
    };
}

export const STAFF_ACCOUNT_FIELDS = Object.keys(
    emptyStaffAccountForm,
) as (keyof StaffAccountForm)[];
