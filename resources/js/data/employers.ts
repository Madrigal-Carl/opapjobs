export type Employer = {
    name: string;
    location: string;
    poeaLicenseNo: string;
};

/**
 * In-memory employer list, seeded from the sample jobs and extended
 * when an admin adds a new employer from the post-a-job form.
 */
let employerList: Employer[] = [
    {
        name: 'Al Muhaidib Contracting',
        location: 'Riyadh, Saudi Arabia',
        poeaLicenseNo: 'POEA-1042-SA',
    },
    {
        name: 'NMC Healthcare',
        location: 'Abu Dhabi, UAE',
        poeaLicenseNo: 'DMW-2287-AE',
    },
    {
        name: 'Qatar Building Company',
        location: 'Doha, Qatar',
        poeaLicenseNo: 'POEA-3315-QA',
    },
    {
        name: 'V.Ships Management',
        location: 'Singapore',
        poeaLicenseNo: 'MARI-0912-SG',
    },
    {
        name: 'Royal Caribbean Group',
        location: 'Miami, United States',
        poeaLicenseNo: 'MARI-4408-US',
    },
    {
        name: 'Columbia Shipmanagement',
        location: 'Seattle, United States',
        poeaLicenseNo: 'POEA-7734-US',
    },
];

export function getEmployers(): Employer[] {
    return employerList;
}

const listeners = new Set<() => void>();

export function subscribeEmployers(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/**
 * Adds an employer and returns the stored record. Duplicate
 * names are ignored so the list never shows the same company twice.
 */
export function addEmployer(employer: Employer): Employer {
    const name = employer.name.trim();
    const existing = employerList.find(
        (item) => item.name.toLowerCase() === name.toLowerCase(),
    );

    if (existing) {
        return existing;
    }

    const created: Employer = {
        name,
        location: employer.location.trim(),
        poeaLicenseNo: employer.poeaLicenseNo.trim(),
    };

    employerList = [...employerList, created];
    listeners.forEach((listener) => listener());

    return created;
}

export function getEmployer(name: string): Employer | undefined {
    return employerList.find((item) => item.name === name);
}
