import {
    BriefcaseBusiness,
    CalendarPlus,
    LogIn,
    Mail,
    Pencil,
    Phone,
    type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
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
    /** Shown as an "Edit account" action when the viewer may manage staff. */
    onEdit?: (account: Account) => void;
};

const linkClass =
    'rounded-sm underline decoration-[var(--line)] underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring';

function formatDate(value?: string | null): string | null {
    if (!value) {
        return null;
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

function ActivityStat({
    icon: Icon,
    label,
    value,
    muted = false,
}: {
    icon: LucideIcon;
    label: string;
    value: ReactNode;
    muted?: boolean;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-[var(--line)] bg-white p-3.5">
            <dt className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--slate)]">
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
            </dt>
            <dd
                className={
                    muted
                        ? 'text-sm text-[var(--slate)] italic'
                        : 'text-sm font-semibold text-[var(--navy-deep)] tabular-nums'
                }
            >
                {value}
            </dd>
        </div>
    );
}

function ContactRow({
    icon: Icon,
    label,
    children,
}: {
    icon: LucideIcon;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-soft)] text-[var(--navy)]"
                aria-hidden="true"
            >
                <Icon className="size-4" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-[11px] text-[var(--slate)]">{label}</dt>
                <dd className="text-sm font-medium [overflow-wrap:anywhere] text-[var(--navy-deep)]">
                    {children}
                </dd>
            </div>
        </div>
    );
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

    const lastSignIn = formatDate(account.lastActive);
    const dateAdded = formatDate(account.dateAdded);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden border-[var(--line)] p-0 sm:max-w-xl">
                <DialogHeader className="shrink-0 border-b border-[var(--line)] bg-[var(--surface-soft)]/60 px-6 pt-6 pr-12 pb-5 text-left">
                    <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--slate)] uppercase">
                        Staff account
                    </p>
                    <div className="mt-3 flex items-center gap-4">
                        <Avatar
                            className="size-16 shrink-0 ring-4 ring-white"
                            aria-hidden="true"
                        >
                            <AvatarFallback className="bg-[var(--navy-deep)] font-serif text-xl font-bold text-white">
                                {getNameInitials(account.fullName)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <DialogTitle className="font-serif text-xl leading-snug font-bold [overflow-wrap:anywhere] text-[var(--navy-deep)] sm:text-2xl">
                                {account.fullName}
                            </DialogTitle>
                            <div className="flex flex-wrap items-center gap-2">
                                <AccountStatusBadge status={account.status} />
                            </div>
                        </div>
                    </div>
                    <DialogDescription className="sr-only">
                        Contact information, account activity and notes for{' '}
                        {account.fullName}.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex min-h-0 flex-col gap-6 overflow-y-auto overscroll-contain px-6 py-5">
                    <section
                        className="flex flex-col gap-3"
                        aria-labelledby="staff-activity-heading"
                    >
                        <h3
                            id="staff-activity-heading"
                            className="text-[11px] font-bold tracking-[0.08em] text-[var(--slate)] uppercase"
                        >
                            Activity
                        </h3>
                        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <ActivityStat
                                icon={BriefcaseBusiness}
                                label="Jobs created"
                                value={account.jobsCreated.toLocaleString(
                                    'en-US',
                                )}
                            />
                            <ActivityStat
                                icon={LogIn}
                                label="Last sign-in"
                                value={lastSignIn ?? 'Never signed in'}
                                muted={lastSignIn === null}
                            />
                            <ActivityStat
                                icon={CalendarPlus}
                                label="Date added"
                                value={dateAdded ?? 'Unknown'}
                                muted={dateAdded === null}
                            />
                        </dl>
                    </section>

                    <section
                        className="flex flex-col gap-3"
                        aria-labelledby="staff-contact-heading"
                    >
                        <h3
                            id="staff-contact-heading"
                            className="text-[11px] font-bold tracking-[0.08em] text-[var(--slate)] uppercase"
                        >
                            Contact
                        </h3>
                        <dl className="flex flex-col divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] px-4 py-3">
                            <ContactRow icon={Mail} label="Work email">
                                <a
                                    href={`mailto:${account.email}`}
                                    className={linkClass}
                                >
                                    {account.email}
                                </a>
                            </ContactRow>
                            <ContactRow icon={Phone} label="Mobile number">
                                {account.phone ? (
                                    <a
                                        href={`tel:${account.phone.replaceAll(' ', '')}`}
                                        className={linkClass}
                                    >
                                        {account.phone}
                                    </a>
                                ) : (
                                    <span className="font-normal text-[var(--slate)] italic">
                                        Not provided
                                    </span>
                                )}
                            </ContactRow>
                        </dl>
                    </section>

                    <section
                        className="flex flex-col gap-3"
                        aria-labelledby="staff-notes-heading"
                    >
                        <h3
                            id="staff-notes-heading"
                            className="text-[11px] font-bold tracking-[0.08em] text-[var(--slate)] uppercase"
                        >
                            Internal notes
                        </h3>
                        {account.notes ? (
                            <p className="rounded-lg border-l-4 border-[var(--teal)] bg-[var(--surface-soft)]/60 py-3 pr-4 pl-4 text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-[var(--navy)]">
                                {account.notes}
                            </p>
                        ) : (
                            <p className="rounded-lg border border-dashed border-[var(--line)] px-4 py-3 text-sm text-[var(--slate)] italic">
                                No notes added.
                            </p>
                        )}
                    </section>
                </div>

                <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-[var(--line)] bg-[var(--surface-soft)]/50 px-6 py-4 sm:flex-row sm:justify-end">
                    <Button
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                    {onEdit && (
                        <Button
                            onClick={() => onEdit(account)}
                            data-testid="button-view-edit-staff"
                        >
                            <Pencil aria-hidden="true" /> Edit account
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
