import { useRef } from 'react';
import { Camera, Mail, MapPin, Pencil, Phone } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

/**
 * The navy "document cover" band at the top of the resume page: identity,
 * contact chips, a completeness meter and the photo upload entry point.
 */
export function ResumeCover({
    avatarUrl,
    name,
    headline,
    email,
    phone,
    location,
    initials,
    completeness,
    onEditProfile,
    onAvatarChange,
}: {
    avatarUrl: string;
    name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    initials: string;
    /** 0–100, shown as a labelled meter rather than a bare number. */
    completeness: number;
    onEditProfile: () => void;
    onAvatarChange: (file: File) => void;
}) {
    const avatarInputRef = useRef<HTMLInputElement>(null);

    return (
        <section className="resume-cover">
            <div className="mx-auto max-w-6xl">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:text-left">
                        <div className="group relative shrink-0">
                            <Avatar className="h-28 w-28 border-4 border-white bg-[var(--navy-soft)] shadow-lg sm:h-32 sm:w-32">
                                {avatarUrl && (
                                    <AvatarImage src={avatarUrl} alt="" />
                                )}
                                <AvatarFallback className="bg-[var(--teal)] font-serif text-4xl font-bold text-white">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <label
                                className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-[var(--navy-deep)]/60 text-white opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100"
                                aria-label="Change profile photo"
                            >
                                <Camera size={24} aria-hidden="true" />
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];

                                        if (file) {
                                            onAvatarChange(file);
                                        }

                                        if (avatarInputRef.current) {
                                            avatarInputRef.current.value = '';
                                        }
                                    }}
                                    data-testid="input-avatar-upload"
                                />
                            </label>
                        </div>

                        <div className="min-w-0">
                            <h1 className="font-serif text-3xl leading-tight font-bold tracking-[-0.04em] text-white sm:text-4xl">
                                {name}
                            </h1>
                            <p className="mt-1.5 text-sm text-[var(--teal-light)]">
                                {headline}
                            </p>
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                {[
                                    {
                                        icon: Mail,
                                        value: email,
                                        key: 'email',
                                    },
                                    {
                                        icon: Phone,
                                        value: phone,
                                        key: 'phone',
                                    },
                                    {
                                        icon: MapPin,
                                        value: location,
                                        key: 'location',
                                    },
                                ].map(({ icon: Icon, value, key }) => (
                                    <span key={key} className="resume-chip">
                                        <Icon size={13} aria-hidden="true" />
                                        {value}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-center gap-5 lg:items-end">
                        <div className="resume-strength">
                            <div className="flex items-baseline justify-between gap-4">
                                <span className="resume-strength-label">
                                    Resume completeness
                                </span>
                                <span className="resume-strength-value">
                                    {completeness}%
                                </span>
                            </div>
                            <div
                                className="resume-strength-track"
                                role="meter"
                                aria-valuenow={completeness}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Resume completeness"
                            >
                                <span
                                    className="resume-strength-fill"
                                    style={{ width: `${completeness}%` }}
                                />
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="resume-cover-action"
                            onClick={onEditProfile}
                            data-testid="button-edit-profile"
                        >
                            <Pencil aria-hidden="true" />
                            Edit profile
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
