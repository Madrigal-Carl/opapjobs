import { countryOptions } from '@/data/countries';
import type {
    CustomFieldRecord,
    FormFieldRecord,
    OptionListKey,
    OptionListState,
    OptionRecord,
    SettingsState,
    SiteContentState,
} from '../types';

/**
 * Configuration seeds: option lists, form-field metadata, custom fields,
 * site content and platform settings (console spec §4.9–§4.10, §4.12).
 *
 * `docs/database.md` §6.1 fixes every option list except categories and
 * subcategories as a PHP backed enum. Nothing here is persisted: it is a
 * design surface, so tab 1 carries a standing note saying so.
 */

function options(
    entries: [string, string, boolean?][],
    inUse = new Set<string>(),
): OptionRecord[] {
    return entries.map(([value, label, active = true], index) => ({
        value,
        label,
        active,
        sortOrder: index,
        inUse: inUse.has(value),
    }));
}

export function seedOptionLists(): OptionListState {
    const used = (values: string[]) => new Set(values);

    return {
        contract_types: options(
            [
                ['permanent', 'Permanent'],
                ['fixed', 'Fixed term'],
                ['seasonal', 'Seasonal'],
            ],
            used(['fixed', 'permanent']),
        ),
        education_levels: options(
            [
                ['secondary', 'Secondary'],
                ['vocational', 'Vocational'],
                ['bachelor', "Bachelor's degree"],
                ['master', "Master's degree"],
            ],
            used(['secondary', 'vocational', 'bachelor']),
        ),
        currencies: options(
            [
                ['SAR', 'Saudi Riyal'],
                ['AED', 'UAE Dirham'],
                ['QAR', 'Qatari Riyal'],
                ['USD', 'US Dollar'],
                ['SGD', 'Singapore Dollar'],
                ['PHP', 'Philippine Peso'],
            ],
            used(['SAR', 'AED', 'USD']),
        ),
        languages: options(
            [
                ['english', 'English'],
                ['arabic', 'Arabic'],
                ['tagalog', 'Tagalog'],
                ['spanish', 'Spanish'],
                ['japanese', 'Japanese'],
            ],
            used(['english']),
        ),
        language_proficiency: options([
            ['basic', 'Basic'],
            ['conversational', 'Conversational'],
            ['fluent', 'Fluent'],
            ['native', 'Native or bilingual'],
        ]),
        gender_requirement: options(
            [
                ['any', 'Any gender'],
                ['male', 'Male'],
                ['female', 'Female'],
            ],
            used(['any']),
        ),
        recruitment_types: options(
            [
                ['joborder', 'Job order'],
                ['manpooling', 'Manpower pooling'],
            ],
            used(['joborder', 'manpooling']),
        ),
        application_stages: options(
            [
                ['applied', 'Applied'],
                ['reviewed', 'Reviewed'],
                ['interview', 'Interview'],
                ['hired', 'Hired'],
                ['pending', 'Pending'],
            ],
            used(['applied', 'reviewed', 'interview', 'hired', 'pending']),
        ).map((record) => ({
            ...record,
            tone: stageTone(record.value),
        })),
        availability: options(
            [
                ['immediately', 'Immediately'],
                ['within_2_weeks', 'Within 2 weeks'],
                ['within_1_month', 'Within 1 month'],
                ['more_than_1_month', 'More than 1 month'],
            ],
            used(['immediately', 'within_2_weeks', 'within_1_month']),
        ),
        skill_levels: options([
            ['beginner', 'Beginner'],
            ['intermediate', 'Intermediate'],
            ['advanced', 'Advanced'],
            ['expert', 'Expert'],
        ]),
        document_types: options(
            [
                ['resume', 'Resume'],
                ['certificate', 'Certificate'],
                ['passport', 'Passport'],
                ['other', 'Other'],
            ],
            used(['resume', 'certificate', 'passport']),
        ),
        question_answer_types: options([
            ['yesno', 'Yes / No'],
            ['short', 'Short answer'],
            ['paragraph', 'Paragraph'],
        ]),
        destination_countries: options(
            countryOptions.map((name) => [
                name.toLowerCase().replaceAll(' ', '_'),
                name,
            ]),
            used([
                'saudi_arabia',
                'united_arab_emirates',
                'qatar',
                'singapore',
            ]),
        ),
        country_dial_codes: options(
            [
                ['+63', 'Philippines +63'],
                ['+966', 'Saudi Arabia +966'],
                ['+971', 'United Arab Emirates +971'],
                ['+974', 'Qatar +974'],
                ['+1', 'United States +1'],
            ],
            used(['+63', '+966']),
        ),
    };
}

/** Pill tones are restricted to the ones `badges.tsx` actually renders. */
function stageTone(value: string): string {
    const tones: Record<string, string> = {
        applied: 'info',
        reviewed: 'navy',
        interview: 'indigo',
        hired: 'success',
        pending: 'neutral',
    };

    return tones[value] ?? 'neutral';
}

function field(
    owner: FormFieldRecord['owner'],
    key: string,
    label: string,
    section: string,
    overrides: Partial<FormFieldRecord> = {},
): FormFieldRecord {
    return {
        id: `${owner}-${key}`,
        owner,
        sortOrder: 0,
        label,
        helpText: '',
        placeholder: '',
        section,
        required: false,
        visible: true,
        isSystem: true,
        type: 'text',
        key,
        ...overrides,
    };
}

function inOrder(records: FormFieldRecord[]): FormFieldRecord[] {
    return records.map((record, index) => ({ ...record, sortOrder: index }));
}

export function seedFormFields(): FormFieldRecord[] {
    return [
        ...inOrder([
            field('job_post', 'agency_id', 'Post on behalf of', 'Agency', {
                type: 'select',
                required: true,
                helpText: 'Category choices follow this Agency’s pathway.',
            }),
            field('job_post', 'recruitment_type', 'Recruitment type', 'Job', {
                type: 'select',
                required: true,
            }),
            field('job_post', 'job_title', 'Job title', 'Job', {
                required: true,
                placeholder: 'Registered Nurse',
            }),
            field('job_post', 'job_subcategory_id', 'Subcategory', 'Job', {
                type: 'select',
                required: true,
                helpText: 'Choose a category first.',
            }),
            field('job_post', 'work_location', 'Work location', 'Job', {
                required: true,
                placeholder: 'Riyadh, Saudi Arabia',
            }),
            field('job_post', 'job_order_number', 'Job order number', 'Job', {
                required: true,
                helpText: 'Required for job order postings.',
            }),
            field('job_post', 'vacant_positions', 'Vacant positions', 'Pay', {
                type: 'number',
                required: true,
            }),
            field('job_post', 'contract_type', 'Contract type', 'Pay', {
                type: 'select',
                required: true,
            }),
            field('job_post', 'salary_currency', 'Salary currency', 'Pay', {
                type: 'select',
            }),
            field(
                'job_post',
                'monthly_salary_min',
                'Minimum monthly salary',
                'Pay',
                {
                    type: 'number',
                },
            ),
            field(
                'job_post',
                'monthly_salary_max',
                'Maximum monthly salary',
                'Pay',
                {
                    type: 'number',
                },
            ),
            field(
                'job_post',
                'education_level',
                'Education level',
                'Requirements',
                {
                    type: 'select',
                    required: true,
                },
            ),
            field(
                'job_post',
                'min_experience_years',
                'Minimum experience',
                'Requirements',
                {
                    type: 'number',
                },
            ),
            field(
                'job_post',
                'max_experience_years',
                'Maximum experience',
                'Requirements',
                {
                    type: 'number',
                },
            ),
            field(
                'job_post',
                'gender_requirement',
                'Gender requirement',
                'Requirements',
                {
                    type: 'select',
                    required: true,
                },
            ),
            field(
                'job_post',
                'required_documents',
                'Required documents',
                'Requirements',
                {
                    type: 'chips',
                },
            ),
            field('job_post', 'job_description', 'Description', 'Description', {
                type: 'richtext',
                required: true,
            }),
            field(
                'job_post',
                'other_requirements',
                'Other requirements',
                'Description',
                {
                    type: 'richtext',
                },
            ),
            field(
                'job_post',
                'application_instructions',
                'Application instructions',
                'Description',
                {
                    type: 'richtext',
                },
            ),
            field(
                'job_post',
                'contact_person_name',
                'Contact person',
                'Contact',
                {
                    required: true,
                },
            ),
            field('job_post', 'contact_email', 'Contact email', 'Contact', {
                type: 'email',
                required: true,
            }),
            field('job_post', 'contact_phone', 'Contact phone', 'Contact', {
                type: 'phone',
            }),
            field('job_post', 'closing_date', 'Closing date', 'Closing', {
                type: 'date',
            }),
            field('job_post', 'is_urgent', 'Urgent hiring', 'Closing', {
                type: 'toggle',
            }),
        ]),
        ...inOrder([
            field('agency_profile', 'agency_name', 'Agency name', 'Profile', {
                required: true,
            }),
            field('agency_profile', 'slug', 'Slug', 'Profile', {
                helpText: 'Generated from the name, editable.',
            }),
            field('agency_profile', 'pathway', 'Pathway', 'Profile', {
                type: 'select',
                required: true,
                helpText: 'Locked once the Agency has job posts.',
            }),
            field(
                'agency_profile',
                'dmw_license_number',
                'DMW licence number',
                'Profile',
                {
                    required: true,
                },
            ),
            field(
                'agency_profile',
                'headquarters_city',
                'Headquarters city',
                'Profile',
                {
                    required: true,
                },
            ),
            field('agency_profile', 'agency_size', 'Agency size', 'Profile', {
                helpText: 'Free text — not a fixed list.',
            }),
            field(
                'agency_profile',
                'year_established',
                'Year established',
                'Profile',
                {
                    type: 'number',
                },
            ),
            field('agency_profile', 'about', 'About', 'Profile', {
                type: 'richtext',
            }),
            field('agency_profile', 'logo_path', 'Logo', 'Profile', {
                type: 'file',
            }),
            field('agency_profile', 'public_phone', 'Public phone', 'Contact', {
                type: 'phone',
            }),
            field('agency_profile', 'public_email', 'Public email', 'Contact', {
                type: 'email',
            }),
            field(
                'agency_profile',
                'public_address',
                'Public address',
                'Contact',
                {
                    type: 'textarea',
                },
            ),
            field('agency_profile', 'facebook_url', 'Facebook', 'Social', {
                type: 'url',
            }),
            field('agency_profile', 'instagram_url', 'Instagram', 'Social', {
                type: 'url',
            }),
            field('agency_profile', 'x_url', 'X', 'Social', { type: 'url' }),
            field('agency_profile', 'website_url', 'Website', 'Social', {
                type: 'url',
            }),
        ]),
        ...inOrder([
            field('applicant_profile', 'headline', 'Headline', 'Profile', {
                required: true,
            }),
            field(
                'applicant_profile',
                'phone_number',
                'Phone number',
                'Profile',
                {
                    type: 'phone',
                    required: true,
                },
            ),
            field(
                'applicant_profile',
                'current_location',
                'Current location',
                'Profile',
                {
                    required: true,
                },
            ),
            field('applicant_profile', 'avatar_path', 'Photo', 'Profile', {
                type: 'file',
            }),
            field(
                'applicant_profile',
                'professional_summary',
                'Professional summary',
                'Profile',
                {
                    type: 'textarea',
                },
            ),
            field(
                'applicant_profile',
                'default_cover_letter',
                'Default cover letter',
                'Profile',
                {
                    type: 'textarea',
                },
            ),
            field(
                'applicant_profile',
                'availability',
                'Availability',
                'Preferences',
                {
                    type: 'select',
                },
            ),
            field(
                'applicant_profile',
                'preferred_pathway',
                'Preferred pathway',
                'Preferences',
                {
                    type: 'select',
                },
            ),
            field(
                'applicant_profile',
                'is_visible_to_agencies',
                'Visible to agencies',
                'Preferences',
                {
                    type: 'toggle',
                    helpText: 'Candidate-directory visibility only.',
                },
            ),
        ]),
        ...inOrder([
            field(
                'application',
                'resume_document_id',
                'Chosen resume',
                'Application',
                {
                    type: 'select',
                },
            ),
            field(
                'application',
                'cover_letter',
                'Cover letter',
                'Application',
                {
                    type: 'textarea',
                },
            ),
            field(
                'application',
                'expected_monthly_salary',
                'Expected monthly salary',
                'Application',
                {
                    type: 'number',
                },
            ),
            field(
                'application',
                'availability',
                'Availability',
                'Application',
                {
                    type: 'select',
                },
            ),
        ]),
    ];
}

export function seedCustomFields(): CustomFieldRecord[] {
    return [
        {
            id: 'custom-1',
            owner: 'job_post',
            label: 'Site induction required',
            key: 'site_induction_required',
            type: 'yes_no',
            options: [],
            required: false,
            visible: true,
            helpText: 'Shown to applicants before they apply.',
            section: 'Requirements',
            sortOrder: 0,
        },
    ];
}

export function seedContent(): SiteContentState {
    return {
        announcement: {
            enabled: true,
            text: 'DMW advisory: verify your agency licence before paying any fee.',
            link: '/contact',
        },
        homeHero: {
            headline: 'Land the overseas job that fits your experience.',
            subtext:
                'Compare real job posts, see what each agency asks for, and keep every application in one place.',
            primaryCta: 'Browse jobs',
            secondaryCta: 'Build your resume',
        },
        homeStats: [
            { label: 'Job posts', value: '1,240' },
            { label: 'Partner agencies', value: '86' },
            { label: 'Hired this year', value: '3,510' },
            { label: 'Land-based roles', value: '62%' },
        ],
        homeResources: [
            {
                id: 'resource-1',
                icon: 'FileText',
                eyebrow: 'Prepare',
                title: 'Build a resume agencies can read',
                body: 'Keep your experience, education and certifications in one place so every application starts from a complete profile.',
                link: '/resume',
            },
            {
                id: 'resource-2',
                icon: 'ClipboardList',
                eyebrow: 'Apply',
                title: 'Answer screening questions once',
                body: 'Job posts list their requirements up front, including documents, so you know what to prepare before you apply.',
                link: '/jobs',
            },
            {
                id: 'resource-3',
                icon: 'MessageSquareText',
                eyebrow: 'Check',
                title: 'Research the agency first',
                body: 'Every agency profile shows its DMW licence number, pathway and reviews from applicants who applied before you.',
                link: '/agencies',
            },
        ],
        contactDesks: [
            {
                id: 'desk-1',
                label: 'Applications and documents',
                email: 'applications@opapjobs.ph',
                phone: '+63 2 8555 0100',
                blurb: 'Questions about a job post you already applied to.',
            },
            {
                id: 'desk-2',
                label: 'Account and resume',
                email: 'support@opapjobs.ph',
                phone: '+63 2 8555 0111',
                blurb: 'Sign-in problems, resume edits and visibility settings.',
            },
        ],
        footerLinks: [
            { id: 'link-1', label: 'Browse jobs', href: '/jobs' },
            { id: 'link-2', label: 'Agencies', href: '/agencies' },
            { id: 'link-3', label: 'Contact', href: '/contact' },
        ],
        socialUrls: {
            facebook: 'https://www.facebook.com/',
            instagram: 'https://www.instagram.com/',
            x: 'https://x.com/',
            website: 'https://opapjobs.ph/',
        },
    };
}

export function seedSettings(): SettingsState {
    return {
        platformName: 'OPAP Job Abroad',
        supportEmail: 'support@opapjobs.ph',
        defaultAgencyUserLimit: 5,
        documentQuota: {
            maxFiles: 10,
            maxFileSizeMb: 5,
            allowedTypes: ['pdf', 'doc', 'docx'],
        },
        applicantSignupOpen: true,
        maintenanceBanner: null,
    };
}

export const OPTION_LIST_KEYS: OptionListKey[] = [
    'contract_types',
    'education_levels',
    'currencies',
    'languages',
    'language_proficiency',
    'gender_requirement',
    'recruitment_types',
    'application_stages',
    'availability',
    'skill_levels',
    'document_types',
    'question_answer_types',
    'destination_countries',
    'country_dial_codes',
];
