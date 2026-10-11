export type Pathway = 'landbased' | 'seabased';

export type Agency = {
    name: string;
    location: string;
    mark: string;
    jobs: number;
    rating: string;
    license: string;
    pathway: Pathway;
    topHirer?: boolean;
};
