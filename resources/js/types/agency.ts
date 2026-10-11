export type Pathway = 'landbased' | 'seabased';

export type AgencyReview = {
    reviewer: string;
    rating: number;
    date: string;
    comment: string;
};

export type AgencyContact = {
    phone: string;
    email: string;
    address: string;
};

export type AgencySocial = {
    facebook?: string;
    instagram?: string;
    x?: string;
    website?: string;
};

export type Agency = {
    slug: string;
    name: string;
    location: string;
    mark: string;
    logo?: string;
    jobs: number;
    rating: string;
    license: string;
    pathway: Pathway;
    topHirer?: boolean;
    description?: string;
    yearsInOperation?: number;
    size?: string;
    contact?: AgencyContact;
    social?: AgencySocial;
    reviews?: AgencyReview[];
};
