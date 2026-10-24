import { Head } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    MoreHorizontal,
    SearchX,
    UserCheck,
    UserRoundPlus,
    Users,
    UserX,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AccountStatusBadge } from '@/components/dashboard/badges';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
import { KpiCard, KpiGrid } from '@/components/dashboard/kpi-card';
import { DashboardPage } from '@/components/dashboard/page';
import { PageHeader } from '@/components/dashboard/page-header';
import { StaffFormDialog } from '@/components/dashboard/accounts/staff-form-dialog';
import { StaffViewDialog } from '@/components/dashboard/accounts/staff-view-dialog';
import { Button } from '@/components/ui/button';
import {
    DataTable,
    DataTableField,
    DataTableRefreshButton,
    DataTableSearch,
    DataTableSelect,
    DataTableToolbar,
    type Column,
} from '@/components/dashboard/data-table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { paginate, ACCOUNTS_PER_PAGE } from '@/data/selectors';
import { accounts as initialAccounts } from '@/data/accounts';
import { accounts as accountsRoute } from '@/routes/dashboard';
import type { Account, AccountStatus } from '@/types/account';

const DEFAULT_PAGE = 1;

const postedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const statusOptions = [
    { value: 'all', label: 'All status' },
    { value: 'Active', label: 'Active' },
    { value: 'Suspended', label: 'Suspended' },
];

const accountColumns: Column<Account>[] = [
    {
        key: 'staff',
        header: 'Staff member',
        width: '40%',
        cell: (account) => (
            <div className="min-w-0">
                <span
                    className="block max-w-[22rem] truncate font-bold text-[var(--navy-deep)]"
                    title={account.fullName}
                >
                    {account.fullName}
                </span>
                <span
                    className="block max-w-[22rem] truncate text-xs text-[var(--slate)]"
                    title={account.email}
                >
                    {account.email}
                </span>
            </div>
        ),
    },
    {
        key: 'employeeId',
        header: 'Employee ID',
        width: '20%',
        cell: (account) => (
            <span className="text-[var(--navy-deep)]">
                {account.employeeId}
            </span>
        ),
    },
    {
        key: 'jobsCreated',
        header: 'Jobs created',
        width: '18%',
        align: 'center',
        className: 'text-center',
        cell: (account) => (
            <span className="tabular-nums">{account.jobsCreated}</span>
        ),
    },
    {
        key: 'status',
        header: 'Status',
        width: '22%',
        align: 'center',
        className: 'text-center',
        cell: (account) => (
            <div className="flex items-center justify-center gap-2">
                <AccountStatusBadge status={account.status} />
            </div>
        ),
    },
];

function AccountRowMenu({
    account,
    onView,
    onEdit,
}: {
    account: Account;
    onView: (account: Account) => void;
    onEdit: (account: Account) => void;
}) {
    const trigger = useRef<HTMLButtonElement>(null);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    ref={trigger}
                    variant="ghost"
                    size="icon"
                    aria-label={`Actions for ${account.fullName}`}
                    data-testid={`button-staff-actions-${account.id}`}
                >
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    trigger.current?.focus();
                }}
            >
                <DropdownMenuItem onSelect={() => onView(account)}>
                    View
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onEdit(account)}>
                    Edit
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function DashboardAccounts() {
    const [staff, setStaff] = useState<Account[]>(initialAccounts);
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>(
        'all',
    );
    const [page, setPage] = useState(1);
    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [viewingAccount, setViewingAccount] = useState<Account | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingStatusAccount, setPendingStatusAccount] =
        useState<Account | null>(null);
    const [targetStatus, setTargetStatus] =
        useState<AccountStatus>('Suspended');

    const isFiltered = Boolean(keyword.trim()) || statusFilter !== 'all';

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();

        return staff.filter((account) => {
            if (statusFilter !== 'all' && account.status !== statusFilter) {
                return false;
            }

            if (!query) {
                return true;
            }

            return [account.fullName, account.email].some((value) =>
                value.toLowerCase().includes(query),
            );
        });
    }, [keyword, staff, statusFilter]);

    const results = useMemo(
        () => paginate(filtered, page, ACCOUNTS_PER_PAGE),
        [filtered, page],
    );

    const activeCount = staff.filter(
        (account) => account.status === 'Active',
    ).length;
    const suspendedCount = staff.length - activeCount;
    const jobsCreatedTotal = staff.reduce(
        (sum, account) => sum + account.jobsCreated,
        0,
    );

    const resetFilters = () => {
        setKeyword('');
        setStatusFilter('all');
        setPage(1);
    };

    const beginAdd = () => {
        setFormMode('add');
        setEditingAccount(null);
        setFormOpen(true);
    };

    const beginEdit = (account: Account) => {
        setFormMode('edit');
        setEditingAccount(account);
        setFormOpen(true);
    };

    const beginView = (account: Account) => {
        setViewingAccount(account);
        setViewOpen(true);
    };

    const handleStatusToggle = (account: Account, checked: boolean) => {
        if (checked) {
            setStaff((current) =>
                current.map((item) =>
                    item.id === account.id
                        ? { ...item, status: 'Active' }
                        : item,
                ),
            );
            toast.success(`${account.fullName}'s account is now active.`);
            return;
        }

        setPendingStatusAccount(account);
        setTargetStatus('Suspended');
        setConfirmOpen(true);
    };

    const confirmStatusChange = () => {
        const account = pendingStatusAccount;

        if (!account) {
            setConfirmOpen(false);
            return;
        }

        const newStatus = targetStatus;

        setStaff((current) =>
            current.map((item) =>
                item.id === account.id ? { ...item, status: newStatus } : item,
            ),
        );

        if (newStatus === 'Suspended') {
            toast.success(`${account.fullName}'s account is now suspended.`);
        } else {
            toast.success(`${account.fullName}'s account is now active.`);
        }

        setConfirmOpen(false);
        setPendingStatusAccount(null);
    };

    return (
        <>
            <Head title="Accounts" />
            <DashboardPage className="md:px-8">
                <PageHeader
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
                <KpiGrid>
                    <KpiCard
                        label="Total Staff"
                        value={staff.length}
                        caption="All staff accounts"
                        icon={Users}
                        tone="blue"
                    />
                    <KpiCard
                        label="Active"
                        value={activeCount}
                        caption="Can sign in to the workspace"
                        icon={UserCheck}
                        tone="emerald"
                    />
                    <KpiCard
                        label="Suspended"
                        value={suspendedCount}
                        caption="Access temporarily disabled"
                        icon={UserX}
                        tone="red"
                    />
                    <KpiCard
                        label="Jobs Created"
                        value={jobsCreatedTotal}
                        caption="Posted by all staff"
                        icon={BriefcaseBusiness}
                        tone="violet"
                    />
                </KpiGrid>
                <DataTable<Account>
                    columns={accountColumns}
                    data={results.items}
                    getRowId={(account) => account.id}
                    getRowTestId={(account) => `row-staff-${account.id}`}
                    getRowAccent={(account) =>
                        account.status === 'Active' ? 'amber' : 'red'
                    }
                    renderRowActions={(account) => (
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={account.status === 'Active'}
                                aria-label={
                                    account.status === 'Active'
                                        ? `Suspend ${account.fullName}`
                                        : `Reactivate ${account.fullName}`
                                }
                                data-testid={`toggle-staff-status-${account.id}`}
                                onCheckedChange={(checked) =>
                                    handleStatusToggle(account, checked)
                                }
                            />
                            <AccountRowMenu
                                account={account}
                                onView={beginView}
                                onEdit={beginEdit}
                            />
                        </div>
                    )}
                    toolbar={
                        <DataTableToolbar data-testid="accounts-table-toolbar">
                            <DataTableField
                                label="Search"
                                htmlFor="filter-search-accounts"
                                className="basis-full sm:min-w-64 sm:flex-1 sm:basis-auto"
                            >
                                <DataTableSearch
                                    id="filter-search-accounts"
                                    value={keyword}
                                    onChange={(value) => {
                                        setKeyword(value);
                                        setPage(1);
                                    }}
                                    placeholder="Search by name or email"
                                    className="w-full"
                                    data-testid="input-search-accounts"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Status"
                                htmlFor="filter-status-accounts"
                            >
                                <DataTableSelect<AccountStatus | 'all'>
                                    id="filter-status-accounts"
                                    value={statusFilter}
                                    onValueChange={(value) => {
                                        setStatusFilter(value);
                                        setPage(1);
                                    }}
                                    options={statusOptions}
                                    ariaLabel="Filter by status"
                                    data-testid="select-staff-status-filter"
                                />
                            </DataTableField>
                            <DataTableRefreshButton
                                onClick={resetFilters}
                                data-testid="button-refresh-accounts"
                            />
                        </DataTableToolbar>
                    }
                    pagination={{
                        page: results.page,
                        totalPages: results.totalPages,
                        onPageChange: setPage,
                        alwaysShow: true,
                        label: 'Staff accounts pagination',
                        testIdPrefix: 'accounts-pagination',
                    }}
                    emptyState={
                        <DashboardEmptyState
                            icon={isFiltered ? SearchX : Users}
                            title={
                                isFiltered
                                    ? 'No staff accounts found'
                                    : 'No staff accounts yet'
                            }
                            message={
                                isFiltered
                                    ? 'No accounts match your search.'
                                    : 'Add a staff member to get started.'
                            }
                            onReset={isFiltered ? resetFilters : undefined}
                        />
                    }
                    data-testid="table-accounts"
                />
            </DashboardPage>

            <StaffFormDialog
                open={formOpen}
                mode={formMode}
                account={editingAccount}
                staff={staff}
                onOpenChange={setFormOpen}
                onAdd={(account) => {
                    setStaff((current) => [account, ...current]);
                }}
                onEdit={(account) => {
                    setStaff((current) =>
                        current.map((item) =>
                            item.id === account.id ? account : item,
                        ),
                    );
                }}
            />

            <StaffViewDialog
                open={viewOpen}
                account={viewingAccount}
                onOpenChange={setViewOpen}
                onEdit={(account) => {
                    setViewOpen(false);
                    beginEdit(account);
                }}
            />

            <Dialog
                open={confirmOpen}
                onOpenChange={(open) => {
                    setConfirmOpen(open);
                    if (!open) {
                        setPendingStatusAccount(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {pendingStatusAccount
                                ? `Suspend ${pendingStatusAccount.fullName}?`
                                : 'Suspend staff account?'}
                        </DialogTitle>
                        <DialogDescription>
                            The staff member will lose access to this workspace
                            until the account is reactivated.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setConfirmOpen(false);
                                setPendingStatusAccount(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmStatusChange}
                            data-testid="button-confirm-status-change"
                        >
                            Suspend account
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
