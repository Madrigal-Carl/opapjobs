export type AccountStatus = 'Active' | 'Suspended';

export type AccountRow = {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    notes?: string | null;
    status: 'active' | 'suspended';
    jobs_created: number;
    last_login_at?: string | null;
    created_at?: string | null;
};

export type Account = {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    notes?: string | null;
    status: AccountStatus;
    jobsCreated: number;
    lastActive?: string | null;
    dateAdded?: string | null;
};
