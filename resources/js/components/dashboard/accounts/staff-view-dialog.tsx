import { BriefcaseBusiness, IdCard, Mail, Phone } from 'lucide-react';
import { AccountStatusBadge } from '@/components/dashboard/badges';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
} from '@/components/ui/dialog';
import { getNameInitials } from '@/lib/name-initials';
import type { Account } from '@/types/account';

type StaffViewDialogProps = {
    open: boolean;
    account: Account | null;
    onOpenChange: (open: boolean) => void;
    onEdit: (account: Account) => void;
};

function formatDate(value?: string | null) {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

export function StaffViewDialog({
    open,
    account,
    onOpenChange,
    onEdit,
}: StaffViewDialogProps) {
    if (!account) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
                <DialogHeader className="space-y-4">
                    <div className="flex items-start gap-4">
                        <Avatar className="size-14">
                            <AvatarFallback className="bg-[var(--surface-soft)] text-base font-semibold text-[var(--navy-deep)]">
                                {getNameInitials(account.fullName)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <h2 className="font-serif text-2xl font-bold tracking-[-0.02em] text-[var(--navy-deep)]">
                                        {account.fullName}
                                    </h2>
                                    <p className="mt-1 text-sm text-[var(--slate)]">
                                        {account.email}
                                    </p>
                                </div>
                                <AccountStatusBadge status={account.status} />
                            </div>
                        </div>
                    </div>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                    <div className="rounded-lg border border-[var(--line)] bg-white">
                        <div className="flex items-center gap-3 px-4 py-3">
                            <IdCard
                                className="size-4 shrink-0 text-[var(--slate)]"
                                aria-hidden="true"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-[var(--slate)]">
                                    Employee ID
                                </p>
                                <p className="text-sm font-semibold text-[var(--navy-deep)]">
                                    {account.employeeId || '—'}
                                </p>
                            </div>
                        </div>
                        <div className="border-t border-[var(--line)]" />
                        <div className="flex items-center gap-3 px-4 py-3">
                            <Mail
                                className="size-4 shrink-0 text-[var(--slate)]"
                                aria-hidden="true"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-[var(--slate)]">
                                    Work email
                                </p>
                                <a
                                    href={`mailto:${account.email}`}
                                    className="block truncate text-sm font-semibold text-[var(--teal)] hover:underline"
                                    title={account.email}
                                >
                                    {account.email}
                                </a>
                            </div>
                        </div>
                        <div className="border-t border-[var(--line)]" />
                        <div className="flex items-center gap-3 px-4 py-3">
                            <Phone
                                className="size-4 shrink-0 text-[var(--slate)]"
                                aria-hidden="true"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-[var(--slate)]">
                                    Mobile number
                                </p>
                                <p className="text-sm font-semibold text-[var(--navy-deep)]">
                                    {account.phone || '—'}
                                </p>
                            </div>
                        </div>
                        <div className="border-t border-[var(--line)]" />
                        <div className="flex items-center gap-3 px-4 py-3">
                            <BriefcaseBusiness
                                className="size-4 shrink-0 text-[var(--slate)]"
                                aria-hidden="true"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-[var(--slate)]">
                                    Jobs created
                                </p>
                                <p className="text-sm font-semibold text-[var(--navy-deep)] tabular-nums">
                                    {account.jobsCreated}
                                </p>
                            </div>
                        </div>
                        <div className="border-t border-[var(--line)]" />
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-[var(--slate)]">
                                    Last active
                                </p>
                                <p className="text-sm font-semibold text-[var(--navy-deep)]">
                                    {formatDate(account.lastActive)}
                                </p>
                            </div>
                        </div>
                    </div>
                    {account.notes ? (
                        <div className="rounded-lg border border-[var(--line)] bg-white px-4 py-3">
                            <p className="text-xs text-[var(--slate)]">Notes</p>
                            <p className="mt-1 text-sm whitespace-pre-wrap text-[var(--navy-deep)]">
                                {account.notes}
                            </p>
                        </div>
                    ) : null}
                </div>
                <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                    <Button
                        onClick={() => {
                            onOpenChange(false);
                            onEdit(account);
                        }}
                    >
                        Edit staff
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
