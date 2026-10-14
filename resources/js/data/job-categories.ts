import type { Pathway } from '@/types/agency';

export type JobCategory = {
    name: string;
    subCategories: string[];
};

/**
 * Categories and sub-categories differ by pathway, mirroring how
 * DMW-accredited overseas work is organised.
 */
const categories: Record<Pathway, JobCategory[]> = {
    landbased: [
        {
            name: 'Construction',
            subCategories: [
                'Electrician',
                'Welder / Fabricator',
                'Mason / Plasterer',
                'Carpenter',
                'Heavy Equipment Operator',
                'Steel Fixer',
                'Painter / Finisher',
            ],
        },
        {
            name: 'Healthcare',
            subCategories: [
                'Registered Nurse',
                'Licensed Practical Nurse',
                'Caregiver',
                'Medical Technician',
                'Pharmacist Assistant',
                'Dental Hygienist',
            ],
        },
        {
            name: 'Hospitality',
            subCategories: [
                'Hotel Front Desk Associate',
                'Housekeeping Attendant',
                'Waiter / Waitress',
                'Sous Chef',
                'Barista',
                'Pastry Chef',
            ],
        },
        {
            name: 'Domestic Work',
            subCategories: [
                'Household Helper',
                'Cook / Cookery Assistant',
                'Elderly Care Assistant',
                'Nanny / Child Carer',
            ],
        },
        {
            name: 'Manufacturing',
            subCategories: [
                'Production Line Worker',
                'Machine Operator',
                'Quality Inspector',
                'Assembler',
                'Forklift Operator',
                'Warehouse Team Lead',
            ],
        },
        {
            name: 'Information Technology',
            subCategories: [
                'IT Support Technician',
                'Systems Administrator',
                'Software Developer',
                'Data Analyst',
                'Help Desk Agent',
            ],
        },
        {
            name: 'Engineering',
            subCategories: [
                'Civil Engineer',
                'Mechanical Engineer',
                'Electrical Engineer',
                'Site Supervisor',
                'QA / QC Inspector',
            ],
        },
        {
            name: 'Logistics',
            subCategories: [
                'Warehouse Team Lead',
                'Dispatcher',
                'Truck Driver',
                'Inventory Controller',
                'Customer Service Representative',
            ],
        },
        {
            name: 'Agriculture',
            subCategories: [
                'Farm Hand',
                'Agronomist',
                'Poultry Worker',
                'Greenhouse Technician',
            ],
        },
    ],
    seabased: [
        {
            name: 'Deck Department',
            subCategories: [
                'Master / Captain',
                'Chief Officer',
                'Second Officer',
                'Third Officer',
                'Deck Cadet',
                'Bosun',
                'Able Seaman',
                'Ordinary Seaman',
                'Chief Deckhand',
            ],
        },
        {
            name: 'Engine Department',
            subCategories: [
                'Chief Engineer',
                'Second Engineer',
                'Third Engineer',
                'Fourth Engineer',
                'Motorman / Oiler',
                'Oiler',
                'Diesel Mechanic',
                'Engine Cadet',
                'Electrician',
            ],
        },
        {
            name: 'Catering / Hotel Department',
            subCategories: [
                'Chief Cook',
                'Cook',
                'Galley Utility',
                'Steward / Stewardess',
                'Barman',
                'Waiter',
            ],
        },
        {
            name: 'Cruise Ship Crew',
            subCategories: [
                'Cruise Ship Nurse',
                'Guest Relations Officer',
                'Entertainment Technician',
                'Retail Shop Associate',
                'Kids Club Attendant',
            ],
        },
        {
            name: 'Offshore',
            subCategories: [
                'Offshore Welder',
                'Roustabout',
                'Rig Medic',
                'HSE Officer',
                'Offshore Technician',
            ],
        },
        {
            name: 'Cargo Operations',
            subCategories: [
                'Tally Clerk',
                'Storekeeper',
                'Cargo Coordinator',
                'Container Supervisor',
            ],
        },
        {
            name: 'Marine Engineering Support',
            subCategories: [
                'Marine Electrician',
                'Marine Engineer Cadet',
                'Diesel Generator Technician',
                'Hydraulic Technician',
            ],
        },
    ],
};

/**
 * Categories available for a pathway. An unknown pathway
 * falls back to landbased.
 */
export function getCategories(pathway: Pathway | 'all' | null): string[] {
    const list = categories[pathway === 'seabased' ? 'seabased' : 'landbased'];

    return list.map((category) => category.name);
}

/**
 * Sub-categories for a category within a pathway. An unknown
 * category returns an empty list so dependent selects stay empty.
 */
export function getSubCategories(
    pathway: Pathway | 'all' | null,
    category: string | null,
): string[] {
    if (!category) {
        return [];
    }

    const list = categories[pathway === 'seabased' ? 'seabased' : 'landbased'];
    const match = list.find((item) => item.name === category);

    return match ? [...match.subCategories] : [];
}
