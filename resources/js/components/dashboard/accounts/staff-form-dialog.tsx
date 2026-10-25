import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { FormInput } from '@/components/form/form-input';
import { PhoneField } from '@/components/ui/phone-field';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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

type FormState = {
    name: string;
    email: string;
    phone: string;
    employee_id: string;
    notes: string;
};

const EMPTY_FORM: FormState = {
    name: '',
    email: '',
    phone: '',
    employee_id: '',
    notes: '',
};

export function StaffFormDialog({
    open,
    mode,
    account,
    onOpenChange,
}: StaffFormDialogProps) {
    const form = useForm<FormState>(EMPTY_FORM);

    useEffect(() => {
        if (!open) {
            form.clearErrors();
            form.reset();
            return;
        }

        if (mode === 'edit' && account) {
            form.setData({
                name: account.fullName,
                email: account.email,
                phone: account.phone ?? '',
                employee_id: account.employeeId,
                notes: account.notes ?? '',
            });
            form.clearErrors();
            return;
        }

        form.setData(EMPTY_FORM);
        form.clearErrors();
    }, [account, mode, open]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (mode === 'edit' && account) {
            form.put(updateAccount(account.id).url, {
                preserveScroll: true,
                onSuccess: () => {
                    onOpenChange(false);
                    form.reset();
                },
            });
            return;
        }

        form.post(storeAccount().url, {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                form.reset();
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'edit'
                            ? 'Edit staff account'
                            : 'Add a staff account'}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'edit'
                            ? 'Update the staff member’s details.'
                            : 'Add a staff member to manage job posts and applications.'}
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-4"
                    data-testid="form-staff-account"
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormInput
                            id="staff-employee-id"
                            label="Employee ID"
                            required
                            value={form.data.employee_id}
                            onChange={(event) => {
                                form.setData('employee_id', event.target.value);
                            }}
                            error={form.errors.employee_id}
                            data-testid="input-staff-employee-id"
                            className="sm:col-span-2"
                        />
                        <FormInput
                            id="staff-full-name"
                            label="Full name"
                            required
                            value={form.data.name}
                            onChange={(event) => {
                                form.setData('name', event.target.value);
                            }}
                            error={form.errors.name}
                            data-testid="input-staff-name"
                        />
                        <div className="flex flex-col gap-1.5">
                            <span className="block text-xs font-semibold text-[#12263F]">
                                Mobile number
                            </span>
                            <PhoneField
                                value={form.data.phone}
                                onChange={(value) => {
                                    form.setData('phone', value);
                                }}
                                id="staff-mobile-number"
                                data-testid="input-staff-phone"
                            />
                            {form.errors.phone ? (
                                <p className="text-xs text-destructive">
                                    {form.errors.phone}
                                </p>
                            ) : null}
                        </div>
                        <FormInput
                            id="staff-email"
                            label="Work email"
                            type="email"
                            required
                            value={form.data.email}
                            onChange={(event) => {
                                form.setData('email', event.target.value);
                            }}
                            error={form.errors.email}
                            data-testid="input-staff-email"
                            className="sm:col-span-2"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="staff-notes"
                            className="block text-xs font-semibold text-[#12263F]"
                        >
                            Notes
                        </label>
                        <Textarea
                            id="staff-notes"
                            value={form.data.notes}
                            onChange={(event) => {
                                form.setData('notes', event.target.value);
                            }}
                            placeholder="Optional notes about this staff member"
                            data-testid="input-staff-notes"
                        />
                        {form.errors.notes ? (
                            <p className="text-xs text-destructive">
                                {form.errors.notes}
                            </p>
                        ) : null}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            data-testid="button-save-staff"
                            disabled={form.processing}
                        >
                            {form.processing
                                ? 'Saving...'
                                : mode === 'edit'
                                  ? 'Save changes'
                                  : 'Add staff account'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
