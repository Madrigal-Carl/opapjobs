import { router } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Mail,
    StickyNote,
    UserPen,
    UserPlus,
    UserRound,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneField } from '@/components/ui/phone-field';
import { Textarea } from '@/components/ui/textarea';
import {
    STAFF_ACCOUNT_FIELDS,
    STAFF_NOTES_MAX,
    emptyStaffAccountForm,
    staffAccountFormFromAccount,
    staffAccountFormSchema,
    toStaffAccountPayload,
    type StaffAccountForm,
} from '@/data/staff-account-form';
import { cn } from '@/lib/utils';
import {
    store as storeAccount,
    update as updateAccount,
} from '@/routes/dashboard/accounts';
import type { Account } from '@/types/account';

type StaffFormDialogProps = {
    open: boolean;
    mode: 'add' | 'edit';
    account?: Account | null;
    onOpenChange: (open: boolean) => void;
};

const inputClass =
    'h-10 min-w-0 px-3 py-0 text-sm text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40 aria-invalid:border-destructive aria-invalid:focus:border-destructive aria-invalid:focus-visible:ring-destructive/20';
const labelClass = 'text-xs font-semibold text-[var(--navy)]';
const hintClass = 'text-[11px] leading-relaxed text-[var(--slate)]';

function StaffField({
    id,
    label,
    required,
    optional,
    hint,
    error,
    className,
    children,
}: {
    id: string;
    label: string;
    required?: boolean;
    optional?: boolean;
    hint?: string;
    error?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
            <Label htmlFor={id} className={labelClass}>
                {label}
                {required && <span className="text-destructive"> *</span>}
                {optional && (
                    <span className="font-normal text-[var(--slate)]">
                        {' '}
                        (optional)
                    </span>
                )}
            </Label>
            {children}
            {hint && !error && (
                <p id={`${id}-hint`} className={hintClass}>
                    {hint}
                </p>
            )}
            <InputError
                id={`${id}-error`}
                message={error}
                role="alert"
                className="mt-0"
            />
        </div>
    );
}

function FormGroup({
    icon: Icon,
    title,
    children,
}: {
    icon: LucideIcon;
    title: string;
    children: ReactNode;
}) {
    const headingId = `staff-group-${title.toLowerCase()}`;

    return (
        <section
            aria-labelledby={headingId}
            className="flex min-w-0 flex-col gap-4 border-t border-[var(--line)] pt-5 first:border-t-0 first:pt-0"
        >
            <h3
                id={headingId}
                className="flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] text-[var(--slate)] uppercase"
            >
                <Icon className="size-3.5" aria-hidden="true" />
                {title}
            </h3>
            {children}
        </section>
    );
}

export function StaffFormDialog({
    open,
    mode,
    account,
    onOpenChange,
}: StaffFormDialogProps) {
    const editing = mode === 'edit' && Boolean(account);
    const [processing, setProcessing] = useState(false);
    const {
        register,
        handleSubmit,
        reset,
        setError,
        setValue,
        watch,
        formState: { errors, isSubmitted },
    } = useForm<StaffAccountForm>({
        defaultValues: emptyStaffAccountForm,
        resolver: zodResolver(staffAccountFormSchema),
    });

    useEffect(() => {
        if (open) {
            reset(
                editing && account
                    ? staffAccountFormFromAccount(account)
                    : emptyStaffAccountForm,
            );
        }
    }, [account, editing, open, reset]);

    const phone = watch('phone');
    const notesLength = watch('notes').length;

    const invalid = (field: keyof StaffAccountForm, id: string) => ({
        'aria-invalid': Boolean(errors[field]),
        'aria-describedby': errors[field] ? `${id}-error` : undefined,
    });

    const submit = handleSubmit((values) => {
        const options = {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => onOpenChange(false),
            onError: (serverErrors: Record<string, string>) => {
                for (const [field, message] of Object.entries(serverErrors)) {
                    if (
                        STAFF_ACCOUNT_FIELDS.includes(
                            field as keyof StaffAccountForm,
                        )
                    ) {
                        setError(
                            field as keyof StaffAccountForm,
                            { type: 'server', message },
                            { shouldFocus: true },
                        );
                    }
                }
            },
        };
        const payload = toStaffAccountPayload(values);

        if (editing && account) {
            router.put(updateAccount(account.id).url, payload, options);
            return;
        }

        router.post(storeAccount().url, payload, options);
    });

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!processing) {
                    onOpenChange(next);
                }
            }}
        >
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden border-[var(--line)] p-0 sm:max-w-xl">
                <DialogHeader className="shrink-0 flex-row items-start gap-4 border-b border-[var(--line)] px-6 py-5 pr-12 text-left">
                    <span
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--teal-light)] text-[var(--teal-ink)]"
                        aria-hidden="true"
                    >
                        {editing ? (
                            <UserPen className="size-5" />
                        ) : (
                            <UserPlus className="size-5" />
                        )}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                        <DialogTitle className="font-serif text-lg leading-tight font-bold text-[var(--navy-deep)]">
                            {editing
                                ? 'Edit staff account'
                                : 'Add a staff account'}
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-relaxed text-[var(--slate)]">
                            {editing && account ? (
                                <>
                                    Update{' '}
                                    <span className="font-medium wrap-anywhere text-[var(--navy)]">
                                        {account.fullName}
                                    </span>
                                    ’s details. Changes apply as soon as you
                                    save.
                                </>
                            ) : (
                                'Give a team member access to manage job posts and applications.'
                            )}
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <form
                    id="form-staff-account"
                    onSubmit={submit}
                    noValidate
                    className="flex min-h-0 flex-1 flex-col"
                    data-testid="form-staff-account"
                >
                    <fieldset
                        disabled={processing}
                        className="flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain px-6 py-5"
                    >
                        <FormGroup icon={UserRound} title="Identity">
                            <StaffField
                                id="staff-full-name"
                                label="Full name"
                                required
                                error={errors.name?.message}
                            >
                                <Input
                                    id="staff-full-name"
                                    autoComplete="name"
                                    placeholder="e.g. Maria Santos"
                                    {...register('name')}
                                    {...invalid('name', 'staff-full-name')}
                                    className={inputClass}
                                    data-testid="input-staff-name"
                                />
                            </StaffField>
                        </FormGroup>

                        <FormGroup icon={Mail} title="Contact">
                            <StaffField
                                id="staff-email"
                                label="Work email"
                                required
                                hint={
                                    editing
                                        ? 'They sign in with this address.'
                                        : 'We’ll email a link to this address so they can set their password.'
                                }
                                error={errors.email?.message}
                            >
                                <Input
                                    id="staff-email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="name@agency.com"
                                    {...register('email')}
                                    {...invalid('email', 'staff-email')}
                                    className={inputClass}
                                    data-testid="input-staff-email"
                                />
                            </StaffField>
                            <StaffField
                                id="staff-mobile-number"
                                label="Mobile number"
                                optional
                                error={errors.phone?.message}
                            >
                                <PhoneField
                                    id="staff-mobile-number"
                                    value={phone}
                                    onChange={(value) =>
                                        setValue('phone', value, {
                                            shouldDirty: true,
                                            shouldValidate: isSubmitted,
                                        })
                                    }
                                    {...invalid('phone', 'staff-mobile-number')}
                                />
                            </StaffField>
                        </FormGroup>

                        <FormGroup icon={StickyNote} title="Notes">
                            <StaffField
                                id="staff-notes"
                                label="Internal notes"
                                optional
                                error={errors.notes?.message}
                            >
                                <Textarea
                                    id="staff-notes"
                                    rows={3}
                                    placeholder="Role, branch, or anything your team should know. Only visible to admins."
                                    {...register('notes')}
                                    {...invalid('notes', 'staff-notes')}
                                    className="min-h-[88px] resize-y text-sm text-[var(--navy)] aria-invalid:border-destructive"
                                    data-testid="input-staff-notes"
                                />
                                <p
                                    className={cn(
                                        'self-end text-[11px] tabular-nums',
                                        notesLength > STAFF_NOTES_MAX
                                            ? 'font-medium text-destructive'
                                            : 'text-[var(--slate)]',
                                    )}
                                    aria-live="polite"
                                >
                                    {notesLength.toLocaleString('en-US')} /{' '}
                                    {STAFF_NOTES_MAX.toLocaleString('en-US')}
                                </p>
                            </StaffField>
                        </FormGroup>
                    </fieldset>

                    <DialogFooter className="shrink-0 flex-col-reverse items-stretch gap-3 border-t border-[var(--line)] bg-[var(--surface-soft)]/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[11px] text-[var(--slate)]">
                            Fields marked{' '}
                            <span className="text-destructive">*</span> are
                            required.
                        </p>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row">
                            <Button
                                variant="secondary"
                                type="button"
                                onClick={() => onOpenChange(false)}
                                disabled={processing}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                loading={processing}
                                data-testid="button-save-staff"
                            >
                                {editing ? 'Save changes' : 'Add staff account'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
