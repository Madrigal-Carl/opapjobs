import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { AlertTriangle, Upload } from 'lucide-react';
import { formatFileSize } from '@/data/applicant-profile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { SKILL_LEVELS, type SkillLevel } from '@/types/applicant-profile';

export type ResumeDrawerSection =
    | 'profileHeader'
    | 'summary'
    | 'experience'
    | 'education'
    | 'certification'
    | 'skill'
    | 'document';

/**
 * Loose form-value bag shared between the drawer and the page. Each section's
 * save handler reads the keys it owns.
 */
export type ResumeDrawerValues = Record<string, string | boolean>;

const SECTION_META: Record<
    ResumeDrawerSection,
    { title: string; description: string; required: string[] }
> = {
    profileHeader: {
        title: 'Edit profile',
        description: 'Update your name, headline and contact details.',
        required: ['name', 'email'],
    },
    summary: {
        title: 'Personal summary',
        description: 'A short paragraph about your background.',
        required: ['summary'],
    },
    experience: {
        title: 'Career history',
        description: 'Add or edit a work experience entry.',
        required: ['role', 'company'],
    },
    education: {
        title: 'Education',
        description: 'Add or edit a school entry.',
        required: ['school', 'degree'],
    },
    certification: {
        title: 'Certification',
        description: 'Add or edit a certification entry.',
        required: ['name', 'issuer'],
    },
    skill: {
        title: 'Skill',
        description: 'Add a skill and its proficiency level.',
        required: ['name'],
    },
    document: {
        title: 'Resume document',
        description:
            'Upload a resume and choose whether it is your primary one.',
        required: ['fileName'],
    },
};

const inputClasses =
    'border-[var(--line)] bg-white text-[var(--ink)] focus-visible:border-[var(--teal)] focus-visible:ring-[var(--teal)]/30';

/** Sections whose entries can be removed; the header and summary cannot. */
const DELETABLE: ResumeDrawerSection[] = [
    'experience',
    'education',
    'certification',
    'skill',
    'document',
];

function DrawerField({
    label,
    htmlFor,
    children,
}: {
    label: string;
    htmlFor?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-1.5">
            <Label
                htmlFor={htmlFor}
                className="text-xs font-semibold tracking-[0.08em] text-[var(--navy)] uppercase"
            >
                {label}
            </Label>
            {children}
        </div>
    );
}

/**
 * The right-side drawer every editable resume section opens. Holds its own
 * draft so cancelling really cancels, and refuses to save while a required
 * field is blank.
 */
export function ResumeEditDrawer({
    open,
    section,
    entry,
    isEditing,
    onClose,
    onSave,
    onDelete,
    onDirtyChange,
}: {
    open: boolean;
    section: ResumeDrawerSection | null;
    entry: ResumeDrawerValues | null;
    isEditing: boolean;
    onClose: () => void;
    onSave: (values: ResumeDrawerValues) => void;
    onDelete: () => void;
    /** Tells the page the draft has diverged from the saved entry. */
    onDirtyChange?: (dirty: boolean) => void;
}) {
    const [values, setValues] = useState<ResumeDrawerValues>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    // Reset the form each time the drawer opens for a section or entry.
    useEffect(() => {
        if (open) {
            setValues(entry ?? {});
            setErrors({});
            setConfirmingDelete(false);
        }
    }, [open, section, entry]);

    // Report drift so the page can guard against losing the edits.
    const serialized = JSON.stringify(values);
    const baseline = JSON.stringify(entry ?? {});

    useEffect(() => {
        onDirtyChange?.(open && serialized !== baseline);
    }, [baseline, onDirtyChange, open, serialized]);

    if (!section) {
        return null;
    }

    const meta = SECTION_META[section];
    const canDelete = isEditing && DELETABLE.includes(section);

    const setField = (key: string, value: string | boolean) => {
        setValues((current) => ({ ...current, [key]: value }));
        setErrors((current) => {
            if (!current[key]) {
                return current;
            }

            const next = { ...current };
            delete next[key];

            return next;
        });
    };

    const handleDocumentFile = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setValues((current) => ({
            ...current,
            fileName: file.name,
            fileSize: formatFileSize(file.size),
            fileUrl: URL.createObjectURL(file),
        }));
        setErrors((current) => {
            const next = { ...current };
            delete next.fileName;

            return next;
        });
        event.target.value = '';
    };

    const handleSave = () => {
        const missing: Record<string, string> = {};

        for (const field of meta.required) {
            if (!String(values[field] ?? '').trim()) {
                missing[field] = 'This field is required.';
            }
        }

        if (Object.keys(missing).length > 0) {
            setErrors(missing);

            return;
        }

        onSave(values);
    };

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    onClose();
                }
            }}
        >
            <SheetContent
                side="right"
                className="w-full bg-white sm:max-w-sm"
                data-testid="drawer-resume-edit"
            >
                <SheetHeader className="border-b border-[var(--line)] pb-4 text-left">
                    <SheetTitle className="font-serif text-lg font-bold text-[var(--navy)]">
                        {isEditing
                            ? `Edit ${meta.title.toLowerCase()}`
                            : meta.title}
                    </SheetTitle>
                    <SheetDescription className="text-xs text-[var(--slate)]">
                        {meta.description}
                    </SheetDescription>
                </SheetHeader>

                <div className="grid gap-4 overflow-y-auto py-5">
                    {section === 'profileHeader' && (
                        <>
                            <DrawerField
                                label="Full name"
                                htmlFor="resume-name"
                            >
                                <Input
                                    id="resume-name"
                                    className={inputClasses}
                                    value={String(values.name ?? '')}
                                    onChange={(event) =>
                                        setField('name', event.target.value)
                                    }
                                    aria-invalid={Boolean(errors.name)}
                                    data-testid="input-drawer-name"
                                />
                            </DrawerField>
                            <DrawerField
                                label="Professional headline"
                                htmlFor="resume-headline"
                            >
                                <Input
                                    id="resume-headline"
                                    className={inputClasses}
                                    value={String(values.headline ?? '')}
                                    onChange={(event) =>
                                        setField('headline', event.target.value)
                                    }
                                    placeholder="e.g. Senior Electrical Technician · Middle East"
                                    data-testid="input-drawer-headline"
                                />
                            </DrawerField>
                            <DrawerField label="Email" htmlFor="resume-email">
                                <Input
                                    id="resume-email"
                                    type="email"
                                    className={inputClasses}
                                    value={String(values.email ?? '')}
                                    onChange={(event) =>
                                        setField('email', event.target.value)
                                    }
                                    aria-invalid={Boolean(errors.email)}
                                    data-testid="input-drawer-email"
                                />
                            </DrawerField>
                            <DrawerField label="Phone" htmlFor="resume-phone">
                                <Input
                                    id="resume-phone"
                                    className={inputClasses}
                                    value={String(values.phone ?? '')}
                                    onChange={(event) =>
                                        setField('phone', event.target.value)
                                    }
                                    placeholder="e.g. +63 917 555 0142"
                                    data-testid="input-drawer-phone"
                                />
                            </DrawerField>
                            <DrawerField
                                label="Location"
                                htmlFor="resume-location"
                            >
                                <Input
                                    id="resume-location"
                                    className={inputClasses}
                                    value={String(values.location ?? '')}
                                    onChange={(event) =>
                                        setField('location', event.target.value)
                                    }
                                    placeholder="e.g. Manila, Philippines"
                                    data-testid="input-drawer-location"
                                />
                            </DrawerField>
                        </>
                    )}

                    {section === 'summary' && (
                        <DrawerField label="About me" htmlFor="resume-summary">
                            <Textarea
                                id="resume-summary"
                                rows={7}
                                className={cn(
                                    inputClasses,
                                    'resize-y leading-relaxed',
                                )}
                                value={String(values.summary ?? '')}
                                onChange={(event) =>
                                    setField('summary', event.target.value)
                                }
                                placeholder="Tell employers about your background, strengths and what you're looking for."
                                aria-invalid={Boolean(errors.summary)}
                                data-testid="textarea-drawer-summary"
                            />
                        </DrawerField>
                    )}

                    {section === 'experience' && (
                        <>
                            <DrawerField
                                label="Job title"
                                htmlFor="resume-role"
                            >
                                <Input
                                    id="resume-role"
                                    className={inputClasses}
                                    value={String(values.role ?? '')}
                                    onChange={(event) =>
                                        setField('role', event.target.value)
                                    }
                                    placeholder="e.g. Electrical Technician"
                                    aria-invalid={Boolean(errors.role)}
                                    data-testid="input-drawer-role"
                                />
                            </DrawerField>
                            <DrawerField
                                label="Company"
                                htmlFor="resume-company"
                            >
                                <Input
                                    id="resume-company"
                                    className={inputClasses}
                                    value={String(values.company ?? '')}
                                    onChange={(event) =>
                                        setField('company', event.target.value)
                                    }
                                    aria-invalid={Boolean(errors.company)}
                                    data-testid="input-drawer-company"
                                />
                            </DrawerField>
                            <div className="grid grid-cols-2 gap-3">
                                <DrawerField
                                    label="Start"
                                    htmlFor="resume-start"
                                >
                                    <Input
                                        id="resume-start"
                                        className={inputClasses}
                                        value={String(values.start ?? '')}
                                        onChange={(event) =>
                                            setField(
                                                'start',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="e.g. Mar 2021"
                                        data-testid="input-drawer-start"
                                    />
                                </DrawerField>
                                <DrawerField
                                    label="End (or Present)"
                                    htmlFor="resume-end"
                                >
                                    <Input
                                        id="resume-end"
                                        className={inputClasses}
                                        value={String(values.end ?? '')}
                                        onChange={(event) =>
                                            setField('end', event.target.value)
                                        }
                                        placeholder="e.g. Feb 2026"
                                        data-testid="input-drawer-end"
                                    />
                                </DrawerField>
                            </div>
                            <DrawerField
                                label="Location"
                                htmlFor="resume-exp-location"
                            >
                                <Input
                                    id="resume-exp-location"
                                    className={inputClasses}
                                    value={String(values.location ?? '')}
                                    onChange={(event) =>
                                        setField('location', event.target.value)
                                    }
                                    placeholder="e.g. Riyadh, Saudi Arabia"
                                    data-testid="input-drawer-exp-location"
                                />
                            </DrawerField>
                            <DrawerField
                                label="Description"
                                htmlFor="resume-exp-desc"
                            >
                                <Textarea
                                    id="resume-exp-desc"
                                    rows={4}
                                    className={cn(
                                        inputClasses,
                                        'resize-y leading-relaxed',
                                    )}
                                    value={String(values.description ?? '')}
                                    onChange={(event) =>
                                        setField(
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="A short summary of your responsibilities and achievements."
                                    data-testid="textarea-drawer-exp-description"
                                />
                            </DrawerField>
                        </>
                    )}

                    {section === 'education' && (
                        <>
                            <DrawerField label="School" htmlFor="resume-school">
                                <Input
                                    id="resume-school"
                                    className={inputClasses}
                                    value={String(values.school ?? '')}
                                    onChange={(event) =>
                                        setField('school', event.target.value)
                                    }
                                    aria-invalid={Boolean(errors.school)}
                                    data-testid="input-drawer-school"
                                />
                            </DrawerField>
                            <DrawerField
                                label="Degree / qualification"
                                htmlFor="resume-degree"
                            >
                                <Input
                                    id="resume-degree"
                                    className={inputClasses}
                                    value={String(values.degree ?? '')}
                                    onChange={(event) =>
                                        setField('degree', event.target.value)
                                    }
                                    aria-invalid={Boolean(errors.degree)}
                                    data-testid="input-drawer-degree"
                                />
                            </DrawerField>
                            <DrawerField
                                label="Field of study"
                                htmlFor="resume-field"
                            >
                                <Input
                                    id="resume-field"
                                    className={inputClasses}
                                    value={String(values.field ?? '')}
                                    onChange={(event) =>
                                        setField('field', event.target.value)
                                    }
                                    placeholder="e.g. Electrical Engineering"
                                    data-testid="input-drawer-field"
                                />
                            </DrawerField>
                            <div className="grid grid-cols-2 gap-3">
                                <DrawerField
                                    label="Start year"
                                    htmlFor="resume-edu-start"
                                >
                                    <Input
                                        id="resume-edu-start"
                                        className={inputClasses}
                                        value={String(values.start ?? '')}
                                        onChange={(event) =>
                                            setField(
                                                'start',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="2012"
                                        data-testid="input-drawer-edu-start"
                                    />
                                </DrawerField>
                                <DrawerField
                                    label="End year"
                                    htmlFor="resume-edu-end"
                                >
                                    <Input
                                        id="resume-edu-end"
                                        className={inputClasses}
                                        value={String(values.end ?? '')}
                                        onChange={(event) =>
                                            setField('end', event.target.value)
                                        }
                                        placeholder="2016"
                                        data-testid="input-drawer-edu-end"
                                    />
                                </DrawerField>
                            </div>
                        </>
                    )}

                    {section === 'certification' && (
                        <>
                            <DrawerField
                                label="Certificate name"
                                htmlFor="resume-cert-name"
                            >
                                <Input
                                    id="resume-cert-name"
                                    className={inputClasses}
                                    value={String(values.name ?? '')}
                                    onChange={(event) =>
                                        setField('name', event.target.value)
                                    }
                                    placeholder="e.g. Basic Safety Training (BST)"
                                    aria-invalid={Boolean(errors.name)}
                                    data-testid="input-drawer-cert-name"
                                />
                            </DrawerField>
                            <DrawerField
                                label="Issuing organization"
                                htmlFor="resume-cert-issuer"
                            >
                                <Input
                                    id="resume-cert-issuer"
                                    className={inputClasses}
                                    value={String(values.issuer ?? '')}
                                    onChange={(event) =>
                                        setField('issuer', event.target.value)
                                    }
                                    placeholder="e.g. MARINA"
                                    aria-invalid={Boolean(errors.issuer)}
                                    data-testid="input-drawer-cert-issuer"
                                />
                            </DrawerField>
                            <div className="grid grid-cols-2 gap-3">
                                <DrawerField
                                    label="Issue date"
                                    htmlFor="resume-cert-issued"
                                >
                                    <Input
                                        id="resume-cert-issued"
                                        type="date"
                                        className={inputClasses}
                                        value={String(values.issueDate ?? '')}
                                        onChange={(event) =>
                                            setField(
                                                'issueDate',
                                                event.target.value,
                                            )
                                        }
                                        data-testid="input-drawer-cert-issued"
                                    />
                                </DrawerField>
                                <DrawerField
                                    label="Expiry date"
                                    htmlFor="resume-cert-expiry"
                                >
                                    <Input
                                        id="resume-cert-expiry"
                                        type="date"
                                        className={inputClasses}
                                        value={String(values.expiryDate ?? '')}
                                        onChange={(event) =>
                                            setField(
                                                'expiryDate',
                                                event.target.value,
                                            )
                                        }
                                        data-testid="input-drawer-cert-expiry"
                                    />
                                </DrawerField>
                            </div>
                            <DrawerField
                                label="Credential ID / URL"
                                htmlFor="resume-cert-url"
                            >
                                <Input
                                    id="resume-cert-url"
                                    className={inputClasses}
                                    value={String(values.credentialUrl ?? '')}
                                    onChange={(event) =>
                                        setField(
                                            'credentialUrl',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Optional link to verify the credential"
                                    data-testid="input-drawer-cert-url"
                                />
                            </DrawerField>
                        </>
                    )}

                    {section === 'skill' && (
                        <>
                            <DrawerField
                                label="Skill name"
                                htmlFor="resume-skill-name"
                            >
                                <Input
                                    id="resume-skill-name"
                                    className={inputClasses}
                                    value={String(values.name ?? '')}
                                    onChange={(event) =>
                                        setField('name', event.target.value)
                                    }
                                    placeholder="e.g. Motor Control Circuits"
                                    aria-invalid={Boolean(errors.name)}
                                    data-testid="input-drawer-skill-name"
                                />
                            </DrawerField>
                            <DrawerField label="Proficiency level">
                                <Select
                                    value={String(
                                        values.level ?? 'Intermediate',
                                    )}
                                    onValueChange={(value) =>
                                        setField('level', value)
                                    }
                                >
                                    <SelectTrigger
                                        className={cn('w-full', inputClasses)}
                                        data-testid="select-drawer-skill-level"
                                    >
                                        <SelectValue placeholder="Select a level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SKILL_LEVELS.map((level) => (
                                            <SelectItem
                                                key={level}
                                                value={level as SkillLevel}
                                            >
                                                {level}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </DrawerField>
                        </>
                    )}

                    {section === 'document' && (
                        <>
                            <DrawerField label="Resume file">
                                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[var(--line)] bg-[var(--cream)] px-4 py-8 text-center text-sm text-[var(--slate)] transition hover:border-[var(--teal)] hover:text-[var(--teal)]">
                                    <Upload size={18} aria-hidden="true" />
                                    <span>
                                        {values.fileName
                                            ? String(values.fileName)
                                            : 'Choose a file…'}
                                    </span>
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        className="sr-only"
                                        onChange={handleDocumentFile}
                                        data-testid="input-document-upload"
                                    />
                                </label>
                                {values.fileSize && (
                                    <p className="mt-1 text-xs text-[var(--slate)]">
                                        {String(values.fileSize)}
                                    </p>
                                )}
                                {errors.fileName && (
                                    <p
                                        className="mt-1 text-xs font-medium text-red-700"
                                        role="alert"
                                    >
                                        {errors.fileName}
                                    </p>
                                )}
                            </DrawerField>
                            <label className="flex items-center justify-between gap-4 rounded-md border border-[var(--line)] bg-[var(--cream)] px-4 py-3">
                                <span>
                                    <span className="block text-sm font-medium text-[var(--navy)]">
                                        Set as primary
                                    </span>
                                    <span className="block text-xs text-[var(--slate)]">
                                        Employers see this resume first.
                                    </span>
                                </span>
                                <Checkbox
                                    checked={Boolean(values.primary)}
                                    onCheckedChange={(checked) =>
                                        setField('primary', checked === true)
                                    }
                                    data-testid="checkbox-drawer-primary"
                                />
                            </label>
                        </>
                    )}

                    {Object.keys(errors).length > 0 && (
                        <p
                            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                            role="alert"
                            data-testid="text-drawer-error"
                        >
                            Please fill in the required fields before saving.
                        </p>
                    )}
                </div>

                <SheetFooter className="border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    {canDelete && (
                        <div>
                            {confirmingDelete ? (
                                <div className="flex items-center gap-2">
                                    <AlertTriangle
                                        size={15}
                                        className="text-red-700"
                                        aria-hidden="true"
                                    />
                                    <span className="text-xs font-semibold text-[var(--navy)]">
                                        Delete this entry?
                                    </span>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={onDelete}
                                        data-testid="button-drawer-confirm-delete"
                                    >
                                        Delete
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            setConfirmingDelete(false)
                                        }
                                        data-testid="button-drawer-cancel-delete"
                                    >
                                        Keep
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setConfirmingDelete(true)}
                                    data-testid="button-drawer-delete"
                                >
                                    Delete entry
                                </Button>
                            )}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            data-testid="button-drawer-cancel"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            data-testid="button-drawer-save"
                        >
                            Save changes
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
