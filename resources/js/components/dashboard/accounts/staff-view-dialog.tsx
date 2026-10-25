import { Mail, Phone } from 'lucide-react';
import { AccountStatusBadge } from '@/components/dashboard/badges';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { getNameInitials } from '@/lib/name-initials';
import type { Account } from '@/types/account';

type StaffViewDialogProps = {
    open: boolean;
    account: Account | null;
    onOpenChange: (open: boolean) => void;
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
}: StaffViewDialogProps) {
    if (!account) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden border-[var(--line)] bg-card p-0 sm:max-w-xl">
                <DialogHeader className="shrink-0 border-b border-[var(--line)] px-6 py-5 pr-12 text-left">
                    <DialogTitle className="font-serif text-lg font-bold text-[var(--navy-deep)]">
                        Account details
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Profile, contact information, and account activity for{' '}
                        {account.fullName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex min-h-0 flex-col gap-6 overflow-y-auto overscroll-contain p-6">
                    <div className="flex items-start gap-4">
                        <Avatar className="size-14 shrink-0" aria-hidden="true">
                            <AvatarFallback className="bg-[var(--navy-deep)] font-serif text-lg font-bold text-white">
                                {getNameInitials(account.fullName)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <h3 className="font-serif text-xl leading-snug font-bold [overflow-wrap:anywhere] text-[var(--navy-deep)] sm:text-2xl">
                                {account.fullName}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                <AccountStatusBadge status={account.status} />
                                <dl className="flex min-w-0 flex-wrap gap-x-1.5 text-xs leading-5">
                                    <dt className="text-[var(--slate)]">
                                        Employee ID
                                    </dt>
                                    <dd className="font-medium [overflow-wrap:anywhere] text-[var(--navy-deep)]">
                                        {account.employeeId || '—'}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>

                    <section
                        className="flex flex-col gap-3"
                        aria-labelledby="staff-contact-heading"
                    >
                        <h3
                            id="staff-contact-heading"
                            className="text-sm font-semibold text-[var(--navy-deep)]"
                        >
                            Contact information
                        </h3>
                        <dl className="grid gap-5 sm:grid-cols-2">
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <dt className="flex items-center gap-2 text-xs text-[var(--slate)]">
                                    <Mail
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Work email
                                </dt>
                                <dd className="text-sm leading-6 font-medium [overflow-wrap:anywhere]">
                                    <a
                                        href={`mailto:${account.email}`}
                                        className="rounded-sm text-[var(--navy-deep)] underline decoration-[var(--line)] underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                                    >
                                        {account.email}
                                    </a>
                                </dd>
                            </div>
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <dt className="flex items-center gap-2 text-xs text-[var(--slate)]">
                                    <Phone
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Mobile number
                                </dt>
                                <dd className="text-sm leading-6 font-medium [overflow-wrap:anywhere] text-[var(--navy-deep)]">
                                    {account.phone || '—'}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section
                        className="flex flex-col gap-3"
                        aria-labelledby="staff-activity-heading"
                    >
                        <h3
                            id="staff-activity-heading"
                            className="text-sm font-semibold text-[var(--navy-deep)]"
                        >
                            Account activity
                        </h3>
                        <dl className="grid gap-4 rounded-lg bg-[var(--surface-soft)] p-4 sm:grid-cols-3">
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <dt className="text-xs text-[var(--slate)]">
                                    Jobs created
                                </dt>
                                <dd className="text-sm font-semibold text-[var(--navy-deep)] tabular-nums">
                                    {account.jobsCreated}
                                </dd>
                            </div>
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <dt className="text-xs text-[var(--slate)]">
                                    Last sign-in
                                </dt>
                                <dd className="text-sm font-medium text-[var(--navy-deep)]">
                                    {formatDate(account.lastActive)}
                                </dd>
                            </div>
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <dt className="text-xs text-[var(--slate)]">
                                    Date added
                                </dt>
                                <dd className="text-sm font-medium text-[var(--navy-deep)]">
                                    {formatDate(account.dateAdded)}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section
                        className="flex flex-col gap-2 border-t border-[var(--line)] pt-5"
                        aria-labelledby="staff-notes-heading"
                    >
                        <h3
                            id="staff-notes-heading"
                            className="text-sm font-semibold text-[var(--navy-deep)]"
                        >
                            Notes
                        </h3>
                        <p className="text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-[var(--slate)]">
                            {account.notes || '—'}
                        </p>
                    </section>
                </div>
                <DialogFooter className="shrink-0 border-t border-[var(--line)] px-6 py-4">
                    <Button
                        variant="secondary"
                        className="w-full sm:w-auto"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
