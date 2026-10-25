import { Head, router } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    MoreHorizontal,
    SearchX,
    UserCheck,
    UserRoundPlus,
    Users,
    UserX,
} from 'lucide-react';
import { useRef, useState } from 'react';
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
import { useServerTable } from '@/hooks/use-server-table';
import { accounts as accountsRoute } from '@/routes/dashboard';
import { status as accountStatusRoute } from '@/routes/dashboard/accounts';
import type { Account, AccountRow } from '@/types/account';
import type { Paginated } from '@/types/pagination';

const statusOptions = [
    { value: 'all', label: 'All status' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
];

const DEFAULT_FILTERS = {
    q: null as string | null,
    status: null as string | null,
    per_page: 10,
};
const TABLE_PROPS = ['staff', 'filters'];

const accountColumns: Column<AccountRow>[] = [
    {
        key: 'staff',
        header: 'Staff member',
        width: '40%',
        cell: (account) => (
            <div className="min-w-0">
                <span
                    className="block max-w-[22rem] truncate font-bold text-[var(--navy-deep)]"
                    title={account.name}
                >
                    {account.name}
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
                {account.employee_id}
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
            <span className="tabular-nums">{account.jobs_created}</span>
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
                <AccountStatusBadge
                    status={
                        account.status === 'active' ? 'Active' : 'Suspended'
                    }
                />
            </div>
        ),
    },
];

function mapAccountRow(row: AccountRow): Account {
    return {
        id: String(row.id),
        fullName: row.name,
        email: row.email,
        phone: row.phone,
        employeeId: row.employee_id,
        notes: row.notes,
        status: row.status === 'active' ? 'Active' : 'Suspended',
        jobsCreated: row.jobs_created,
        lastActive: row.last_login_at,
        dateAdded: row.created_at,
    };
}

function AccountRowMenu({
    account,
    canManage,
    onView,
    onEdit,
}: {
    account: Account;
    canManage: boolean;
    onView: (account: Account) => void;
    onEdit: (account: Account) => void;
}) {
    const trigger = useRef<HTMLButtonElement>(null);

    if (!canManage) {
        return null;
    }

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

export default function DashboardAccounts({
    staff,
    filters,
    kpis,
    seats,
    canManageAccounts,
}: {
    staff: Paginated<AccountRow>;
    filters: { q?: string | null; status?: string | null; per_page?: number };
    kpis?: {
        total_staff: number;
        active: number;
        suspended: number;
        jobs_created: number;
    };
    seats: { used: number; limit: number };
    canManageAccounts: boolean;
}) {
    const currentPage = staff.meta?.current_page ?? 1;

    const table = useServerTable({
        url: accountsRoute().url,
        filters: {
            q: filters.q ?? null,
            status: filters.status ?? null,
            per_page: filters.per_page ?? 10,
        },
        page: currentPage,
        defaults: DEFAULT_FILTERS,
        only: TABLE_PROPS,
    });

    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [viewingAccount, setViewingAccount] = useState<Account | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingStatusAccount, setPendingStatusAccount] =
        useState<Account | null>(null);
    const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);

    const isFiltered =
        Boolean((table.values.q ?? '').trim()) ||
        (table.values.status ?? null) !== null;

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
        if (!canManageAccounts) {
            return;
        }

        if (checked) {
            setPendingToggleId(account.id);
            router.patch(
                accountStatusRoute(account.id).url,
                { status: 'active' },
                {
                    preserveScroll: true,
                    onFinish: () => setPendingToggleId(null),
                },
            );
            return;
        }

        setPendingStatusAccount(account);
        setConfirmOpen(true);
    };

    const confirmStatusChange = () => {
        const account = pendingStatusAccount;

        if (!account) {
            setConfirmOpen(false);
            return;
        }

        setPendingToggleId(account.id);
        router.patch(
            accountStatusRoute(account.id).url,
            { status: 'suspended' },
            {
                preserveScroll: true,
                onFinish: () => {
                    setPendingToggleId(null);
                    setConfirmOpen(false);
                    setPendingStatusAccount(null);
                },
            },
        );
    };

    const seatsFull =
        (seats.limit ?? 0) > 0 && (seats.used ?? 0) >= (seats.limit ?? 0);
    const addDisabled = !canManageAccounts || seatsFull;

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
                            disabled={addDisabled}
                            title={
                                seatsFull && canManageAccounts
                                    ? `${seats.used} of ${seats.limit} seats used`
                                    : undefined
                            }
                        >
                            <UserRoundPlus aria-hidden="true" />
                            Add staff
                        </Button>
                    }
                />
                <KpiGrid>
                    <KpiCard
                        label="Total Staff"
                        value={kpis ? kpis.total_staff : '—'}
                        caption={
                            seats.limit > 0
                                ? `${seats.used} of ${seats.limit} seats used`
                                : 'All staff accounts'
                        }
                        icon={Users}
                        tone="blue"
                    />
                    <KpiCard
                        label="Active"
                        value={kpis ? kpis.active : '—'}
                        caption="Can sign in to the workspace"
                        icon={UserCheck}
                        tone="emerald"
                    />
                    <KpiCard
                        label="Suspended"
                        value={kpis ? kpis.suspended : '—'}
                        caption="Access temporarily disabled"
                        icon={UserX}
                        tone="red"
                    />
                    <KpiCard
                        label="Jobs Created"
                        value={kpis ? kpis.jobs_created : '—'}
                        caption="Posted by all staff"
                        icon={BriefcaseBusiness}
                        tone="violet"
                    />
                </KpiGrid>
                <DataTable<AccountRow>
                    columns={accountColumns}
                    data={staff.data ?? []}
                    getRowId={(account) => String(account.id)}
                    getRowTestId={(account) => `row-staff-${account.id}`}
                    getRowAccent={(account) =>
                        account.status === 'active' ? 'amber' : 'red'
                    }
                    renderRowActions={(account) => (
                        <div className="flex items-center gap-2">
                            {canManageAccounts ? (
                                <Switch
                                    checked={account.status === 'active'}
                                    aria-label={
                                        account.status === 'active'
                                            ? `Suspend ${account.name}`
                                            : `Reactivate ${account.name}`
                                    }
                                    data-testid={`toggle-staff-status-${account.id}`}
                                    disabled={
                                        pendingToggleId === String(account.id)
                                    }
                                    onCheckedChange={(checked) =>
                                        handleStatusToggle(
                                            mapAccountRow(account),
                                            checked,
                                        )
                                    }
                                />
                            ) : null}
                            <AccountRowMenu
                                account={mapAccountRow(account)}
                                canManage={canManageAccounts}
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
                                    value={table.values.q ?? ''}
                                    onChange={(value) =>
                                        table.setFilter(
                                            'q',
                                            value === '' ? null : value,
                                        )
                                    }
                                    placeholder="Search by name or email"
                                    className="w-full"
                                    data-testid="input-search-accounts"
                                />
                            </DataTableField>
                            <DataTableField
                                label="Status"
                                htmlFor="filter-status-accounts"
                            >
                                <DataTableSelect<string>
                                    id="filter-status-accounts"
                                    value={
                                        (table.values.status ?? 'all') as string
                                    }
                                    onValueChange={(value) =>
                                        table.setFilter(
                                            'status',
                                            value === 'all' ? null : value,
                                        )
                                    }
                                    options={statusOptions}
                                    ariaLabel="Filter by status"
                                    data-testid="select-staff-status-filter"
                                />
                            </DataTableField>
                            <DataTableRefreshButton
                                onClick={() => table.reset()}
                                data-testid="button-refresh-accounts"
                            />
                        </DataTableToolbar>
                    }
                    pagination={{
                        page: staff.meta?.current_page ?? 1,
                        totalPages: staff.meta?.last_page ?? 1,
                        onPageChange: table.setPage,
                        alwaysShow: true,
                        label: 'Staff accounts pagination',
                        testIdPrefix: 'accounts-pagination',
                    }}
                    emptyState={
                        <DashboardEmptyState
                            icon={isFiltered ? SearchX : Users}
                            title={
                                isFiltered
                                    ? 'No staff match your filters'
                                    : 'No staff yet'
                            }
                            message={
                                isFiltered
                                    ? 'Try adjusting your search or status filter.'
                                    : 'Add your first staff member to get started.'
                            }
                            onReset={isFiltered ? table.reset : undefined}
                        />
                    }
                />
            </DashboardPage>
            <StaffFormDialog
                open={formOpen}
                mode={formMode}
                account={editingAccount}
                onOpenChange={setFormOpen}
            />
            <StaffViewDialog
                open={viewOpen}
                account={viewingAccount}
                onOpenChange={setViewOpen}
            />
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Suspend staff account</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to suspend{' '}
                            <span className="font-medium text-[var(--navy-deep)]">
                                {pendingStatusAccount?.fullName}
                            </span>
                            ? They will be signed out and lose access to the
                            dashboard.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => setConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmStatusChange}
                        >
                            Suspend
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

DashboardAccounts.layout = {
    breadcrumbs: [{ title: 'Accounts', href: accountsRoute() }],
};
