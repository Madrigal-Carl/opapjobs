import { Head } from '@inertiajs/react';
import {
    Pencil,
    Search,
    SearchX,
    ShieldAlert,
    Users,
    UserRoundPlus,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { AccountStatusBadge } from '@/components/dashboard/badges';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import { SummaryStat } from '@/components/dashboard/summary-stat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/pagination';
import { paginate, ACCOUNTS_PER_PAGE } from '@/data/selectors';
import { accounts } from '@/data/accounts';
import { accounts as accountsRoute } from '@/routes/dashboard';
import type { Account } from '@/types/account';
import { DashboardPage } from '@/components/dashboard/page';

export default function DashboardAccounts() {
    const [staff, setStaff] = useState<Account[]>(accounts);
    const [keyword, setKeyword] = useState('');
    const [page, setPage] = useState(1);
    const [formOpen, setFormOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
    const [form, setForm] = useState({ fullName: '', email: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        setPage(1);
    }, [keyword]);

    const query = keyword.trim().toLowerCase();
    const matches = staff.filter((account) => {
        if (!query) {
            return true;
        }

        return [account.fullName, account.email].some((value) =>
            value.toLowerCase().includes(query),
        );
    });

    const results = paginate(matches, page, ACCOUNTS_PER_PAGE);

    const activeCount = staff.filter(
        (account) => account.status === 'Active',
    ).length;
    const isFiltered = query !== '';

    const resetFilters = () => {
        setKeyword('');
        setPage(1);
    };

    const beginAdd = () => {
        setEditingId(null);
        setForm({ fullName: '', email: '' });
        setError('');
        setFormOpen(true);
    };

    const beginEdit = (account: Account) => {
        setEditingId(account.id);
        setForm({ fullName: account.fullName, email: account.email });
        setError('');
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingId(null);
        setError('');
    };

    const submitForm = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const fullName = form.fullName.trim();
        const email = form.email.trim().toLowerCase();

        if (
            staff.some(
                (account) =>
                    account.email.toLowerCase() === email &&
                    account.id !== editingId,
            )
        ) {
            setError('A staff account with this email already exists.');
            return;
        }

        if (editingId) {
            setStaff((current) =>
                current.map((account) =>
                    account.id === editingId
                        ? { ...account, fullName, email }
                        : account,
                ),
            );
            toast.success('Staff account updated.');
        } else {
            setStaff((current) => [
                {
                    id: `staff-${Date.now()}`,
                    fullName,
                    email,
                    status: 'Active',
                    jobsCreated: 0,
                },
                ...current,
            ]);
            toast.success('Staff account added.');
        }

        closeForm();
    };

    const beginStatusChange = (account: Account) => {
        setPendingStatusId(account.id);
        setConfirmOpen(true);
    };

    const confirmStatusChange = () => {
        const id = pendingStatusId;

        setStaff((current) =>
            current.map((account) =>
                account.id === id
                    ? {
                          ...account,
                          status:
                              account.status === 'Active'
                                  ? 'Suspended'
                                  : 'Active',
                      }
                    : account,
            ),
        );

        const changed = staff.find((account) => account.id === id);

        if (changed) {
            toast.success(
                `${changed.fullName}'s account is now ${
                    changed.status === 'Active' ? 'suspended' : 'active'
                }.`,
            );
        }

        setConfirmOpen(false);
        setPendingStatusId(null);
    };

    const pendingAccount = staff.find(
        (account) => account.id === pendingStatusId,
    );

    return (
        <>
            <Head title="Accounts" />

            <DashboardPage>
                <DashboardPageHeader
                    title="Accounts"
                    subtitle="Add staff members, update their details, and manage account status."
                    actions={
                        <Button
                            onClick={beginAdd}
                            data-testid="button-add-staff"
                        >
                            <UserRoundPlus aria-hidden="true" />
                            Add staff
                        </Button>
                    }
                />

                <div
                    className="flex flex-wrap gap-2"
                    aria-label="Account totals"
                >
                    <SummaryStat label="accounts" value={staff.length} />
                    <SummaryStat label="active" value={activeCount} />
                    <SummaryStat
                        label="suspended"
                        value={staff.length - activeCount}
                    />
                </div>

                <p
                    className="rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--slate)]"
                    role="note"
                >
                    Staff account records are sample data stored in the
                    workspace. Login access and invitation emails are not
                    enabled yet.
                </p>

                <Card>
                    <CardContent className="flex flex-col gap-4 pt-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative min-w-56 flex-1">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    type="search"
                                    value={keyword}
                                    onChange={(event) =>
                                        setKeyword(event.target.value)
                                    }
                                    placeholder="Search staff members or emails"
                                    aria-label="Search staff accounts"
                                    className="pl-9"
                                    data-testid="input-search-accounts"
                                />
                            </div>
                            <span className="text-sm text-[var(--slate)] tabular-nums">
                                {results.total}{' '}
                                {results.total === 1 ? 'account' : 'accounts'}
                            </span>
                        </div>

                        {results.items.length ? (
                            <Table data-testid="table-accounts">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Staff member</TableHead>
                                        <TableHead>Work email</TableHead>
                                        <TableHead className="text-right">
                                            Jobs created
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.items.map((account) => (
                                        <TableRow
                                            key={account.id}
                                            data-testid={`row-staff-${account.id}`}
                                        >
                                            <TableCell>
                                                <span className="font-semibold text-[var(--navy)]">
                                                    {account.fullName}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className="block max-w-64 truncate"
                                                    title={account.email}
                                                >
                                                    {account.email}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span
                                                    className="tabular-nums"
                                                    aria-label={`${account.jobsCreated} ${
                                                        account.jobsCreated ===
                                                        1
                                                            ? 'job'
                                                            : 'jobs'
                                                    } created`}
                                                >
                                                    {account.jobsCreated}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <AccountStatusBadge
                                                    status={account.status}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() =>
                                                            beginEdit(account)
                                                        }
                                                        aria-label={`Edit ${account.fullName}`}
                                                        data-testid={`button-edit-staff-${account.id}`}
                                                    >
                                                        <Pencil aria-hidden="true" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant={
                                                            account.status ===
                                                            'Active'
                                                                ? 'destructive'
                                                                : 'secondary'
                                                        }
                                                        size="sm"
                                                        onClick={() =>
                                                            beginStatusChange(
                                                                account,
                                                            )
                                                        }
                                                        aria-label={
                                                            account.status ===
                                                            'Active'
                                                                ? `Suspend ${account.fullName}`
                                                                : `Reactivate ${account.fullName}`
                                                        }
                                                        data-testid={`button-toggle-staff-${account.id}`}
                                                    >
                                                        <ShieldAlert aria-hidden="true" />
                                                        {account.status ===
                                                        'Active'
                                                            ? 'Suspend'
                                                            : 'Reactivate'}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <DashboardEmptyState
                                icon={isFiltered ? SearchX : Users}
                                title="No staff accounts found"
                                message={
                                    isFiltered
                                        ? 'No accounts match your search.'
                                        : 'No staff accounts yet. Add a staff member to get started.'
                                }
                                onReset={isFiltered ? resetFilters : undefined}
                            />
                        )}

                        <Pagination
                            page={results.page}
                            totalPages={results.totalPages}
                            label="Staff accounts pagination"
                            testIdPrefix="accounts-pagination"
                            onPageChange={setPage}
                        />
                    </CardContent>
                </Card>
            </DashboardPage>

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingId
                                ? 'Edit staff account'
                                : 'Add a staff account'}
                        </DialogTitle>
                        <DialogDescription>
                            Update the staff member&apos;s details. Changes are
                            sample data only and stay in this workspace.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={submitForm}
                        className="flex flex-col gap-4"
                        data-testid="form-staff-account"
                    >
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="staff-full-name">Full name</Label>
                            <Input
                                id="staff-full-name"
                                required
                                value={form.fullName}
                                onChange={(event) => {
                                    setForm({
                                        ...form,
                                        fullName: event.target.value,
                                    });
                                    setError('');
                                }}
                                data-testid="input-staff-name"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="staff-email">Work email</Label>
                            <Input
                                id="staff-email"
                                type="email"
                                required
                                value={form.email}
                                onChange={(event) => {
                                    setForm({
                                        ...form,
                                        email: event.target.value,
                                    });
                                    setError('');
                                }}
                                data-testid="input-staff-email"
                            />
                        </div>
                        {error && (
                            <p
                                className="text-sm font-medium text-destructive"
                                role="alert"
                            >
                                {error}
                            </p>
                        )}
                        <DialogFooter>
                            <Button
                                variant="secondary"
                                type="button"
                                onClick={closeForm}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                data-testid="button-save-staff"
                            >
                                {editingId
                                    ? 'Save changes'
                                    : 'Add staff account'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={confirmOpen}
                onOpenChange={(open) => {
                    setConfirmOpen(open);
                    if (!open) {
                        setPendingStatusId(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {pendingAccount?.status === 'Active'
                                ? `Suspend ${pendingAccount?.fullName}?`
                                : `Reactivate ${pendingAccount?.fullName}?`}
                        </DialogTitle>
                        <DialogDescription>
                            {pendingAccount?.status === 'Active'
                                ? 'The staff member will lose access to this workspace until the account is reactivated.'
                                : 'The staff member will regain access to this workspace.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setConfirmOpen(false);
                                setPendingStatusId(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={
                                pendingAccount?.status === 'Active'
                                    ? 'destructive'
                                    : 'primary'
                            }
                            onClick={confirmStatusChange}
                            data-testid="button-confirm-status-change"
                        >
                            {pendingAccount?.status === 'Active'
                                ? 'Suspend account'
                                : 'Reactivate account'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

DashboardAccounts.layout = {
    breadcrumbs: [
        {
            title: 'Accounts',
            href: accountsRoute(),
        },
    ],
};
