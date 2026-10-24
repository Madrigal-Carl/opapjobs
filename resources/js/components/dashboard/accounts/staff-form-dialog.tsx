import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import type { Account } from '@/types/account';

type StaffFormDialogProps = {
    open: boolean;
    mode: 'add' | 'edit';
    account?: Account | null;
    staff: Account[];
    onOpenChange: (open: boolean) => void;
    onAdd: (account: Account) => void;
    onEdit: (account: Account) => void;
};

type FormState = {
    fullName: string;
    email: string;
    phone: string;
    employeeId: string;
    notes: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
    fullName: '',
    email: '',
    phone: '',
    employeeId: '',
    notes: '',
};

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function StaffFormDialog({
    open,
    mode,
    account,
    staff,
    onOpenChange,
    onAdd,
    onEdit,
}: StaffFormDialogProps) {
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [errors, setErrors] = useState<Errors>({});

    useEffect(() => {
        if (!open) {
            setErrors({});
            return;
        }

        if (mode === 'edit' && account) {
            setForm({
                fullName: account.fullName,
                email: account.email,
                phone: account.phone ?? '',
                employeeId: account.employeeId,
                notes: account.notes ?? '',
            });
            setErrors({});
            return;
        }

        setForm(EMPTY_FORM);
        setErrors({});
    }, [account, mode, open]);

    const validate = () => {
        const nextErrors: Errors = {};
        const fullName = form.fullName.trim();
        const email = form.email.trim().toLowerCase();
        const employeeId = form.employeeId.trim();

        if (!fullName) {
            nextErrors.fullName = 'Full name is required.';
        }

        if (!email) {
            nextErrors.email = 'Work email is required.';
        } else if (!isValidEmail(email)) {
            nextErrors.email = 'Enter a valid work email address.';
        } else if (
            staff.some(
                (item) =>
                    item.email.toLowerCase() === email &&
                    item.id !== account?.id,
            )
        ) {
            nextErrors.email =
                'A staff account with this email already exists.';
        }

        if (!employeeId) {
            nextErrors.employeeId = 'Employee ID is required.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!validate()) {
            return;
        }

        const fullName = form.fullName.trim();
        const email = form.email.trim().toLowerCase();
        const phone = form.phone.trim() || null;
        const employeeId = form.employeeId.trim();
        const notes = form.notes.trim() || null;

        if (mode === 'edit' && account) {
            const updated: Account = {
                ...account,
                fullName,
                email,
                phone,
                employeeId,
                notes,
            };
            onEdit(updated);
            toast.success('Staff account updated.');
            onOpenChange(false);
            return;
        }

        const created: Account = {
            id: `staff-${Date.now()}`,
            fullName,
            email,
            phone,
            employeeId,
            jobTitle: null,
            department: null,
            staffRole: null,
            dateHired: null,
            notes,
            status: 'Active',
            jobsCreated: 0,
            lastActive: null,
        };
        onAdd(created);
        toast.success('Staff account added.');
        onOpenChange(false);
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
                            value={form.employeeId}
                            onChange={(event) => {
                                setForm((current) => ({
                                    ...current,
                                    employeeId: event.target.value,
                                }));
                                setErrors((current) => ({
                                    ...current,
                                    employeeId: undefined,
                                }));
                            }}
                            error={errors.employeeId}
                            data-testid="input-staff-employee-id"
                            className="sm:col-span-2"
                        />
                        <FormInput
                            id="staff-full-name"
                            label="Full name"
                            required
                            value={form.fullName}
                            onChange={(event) => {
                                setForm((current) => ({
                                    ...current,
                                    fullName: event.target.value,
                                }));
                                setErrors((current) => ({
                                    ...current,
                                    fullName: undefined,
                                }));
                            }}
                            error={errors.fullName}
                            data-testid="input-staff-name"
                        />
                        <div className="flex flex-col gap-1.5">
                            <span className="block text-xs font-semibold text-[#12263F]">
                                Mobile number
                            </span>
                            <PhoneField
                                value={form.phone}
                                onChange={(value) => {
                                    setForm((current) => ({
                                        ...current,
                                        phone: value,
                                    }));
                                }}
                                id="staff-mobile-number"
                                data-testid="input-staff-phone"
                            />
                        </div>
                        <FormInput
                            id="staff-email"
                            label="Work email"
                            type="email"
                            required
                            value={form.email}
                            onChange={(event) => {
                                setForm((current) => ({
                                    ...current,
                                    email: event.target.value,
                                }));
                                setErrors((current) => ({
                                    ...current,
                                    email: undefined,
                                }));
                            }}
                            error={errors.email}
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
                            value={form.notes}
                            onChange={(event) => {
                                setForm((current) => ({
                                    ...current,
                                    notes: event.target.value,
                                }));
                            }}
                            placeholder="Optional notes about this staff member"
                            data-testid="input-staff-notes"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" data-testid="button-save-staff">
                            {mode === 'edit'
                                ? 'Save changes'
                                : 'Add staff account'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
