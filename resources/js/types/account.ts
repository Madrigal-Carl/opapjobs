export type AccountStatus = 'Active' | 'Suspended';

export type Account = {
    id: string;
    fullName: string;
    email: string;
    status: AccountStatus;
    jobsCreated: number;
};
