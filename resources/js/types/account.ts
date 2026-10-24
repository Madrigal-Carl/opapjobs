export type AccountStatus = 'Active' | 'Suspended';

export type AccountStaffRole =
    | 'Recruiter'
    | 'Coordinator'
    | 'Encoder'
    | 'Supervisor';

export type AccountDepartment =
    | 'Recruitment'
    | 'Placement'
    | 'Documentation'
    | 'Operations'
    | 'Administration';

export type Account = {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    employeeId: string;
    jobTitle?: string | null;
    department?: AccountDepartment | null;
    staffRole?: AccountStaffRole | null;
    dateHired?: string | null;
    notes?: string | null;
    status: AccountStatus;
    jobsCreated: number;
    lastActive?: string | null;
};
