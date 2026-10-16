import { Head } from '@inertiajs/react';
import {
    Check,
    ChevronDown,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Send,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { authLabelClasses } from '@/lib/auth-form-styles';
import { cn } from '@/lib/utils';

const FAQS = [
    {
        question: 'How does OPAP verify DMW accreditation?',
        answer: "We review an agency's published DMW license information and show the accreditation details alongside its listings, so you have a clear starting point for your own checks.",
    },
    {
        question: 'Does OPAP charge placement fees?',
        answer: 'OPAP does not charge jobseekers to browse verified openings. Always review the employment offer and DMW guidance carefully before paying any fee or submitting documents.',
    },
    {
        question: 'How do I report a suspicious job posting?',
        answer: 'Send us the job title, agency name, and a link or screenshot of the listing using the form below. Our team will review the report and follow up when we can.',
    },
    {
        question: 'How long do applications typically take?',
        answer: 'Timelines vary by employer, agency, role and destination. The listing agency is the best source for the next step and the expected interview or document schedule.',
    },
    {
        question: 'How can I update or delete my account?',
        answer: 'Tell us the email address connected to your account and what you would like changed. We will help with account updates or deletion requests.',
    },
    {
        question: 'How do agencies get listed on OPAP?',
        answer: 'Recruitment agencies can contact us for listing support and verification guidance. We review the relevant agency information before publishing a listing.',
    },
];

const ROLES = [
    'Job Seeker / Candidate',
    'Recruitment / Agency',
    'Direct Employer',
    'Other',
];

const SUBJECTS = [
    'Account Issues',
    'Job Posting Support',
    'Job Application Help',
    'Technical Support',
    'Agency Verification',
    'Partnership Inquiry',
    'Report a Problem',
    'Other',
];

type DialCode = {
    code: string;
    name: string;
    dialCode: string;
};

const DIAL_CODES: DialCode[] = [
    { code: 'PH', name: 'Philippines', dialCode: '+63' },
    { code: 'US', name: 'United States', dialCode: '+1' },
    { code: 'CA', name: 'Canada', dialCode: '+1' },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
    { code: 'AU', name: 'Australia', dialCode: '+61' },
    { code: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
    { code: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
    { code: 'QA', name: 'Qatar', dialCode: '+974' },
    { code: 'KW', name: 'Kuwait', dialCode: '+965' },
    { code: 'SG', name: 'Singapore', dialCode: '+65' },
    { code: 'JP', name: 'Japan', dialCode: '+81' },
    { code: 'DE', name: 'Germany', dialCode: '+49' },
];

type ContactForm = {
    role: string;
    fullName: string;
    email: string;
    dialCode: string;
    phone: string;
    subject: string;
    message: string;
};

const EMPTY_FORM: ContactForm = {
    role: '',
    fullName: '',
    email: '',
    dialCode: 'PH',
    phone: '',
    subject: '',
    message: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SelectShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative">
            {children}
            <ChevronDown
                className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[var(--teal)]"
                size={16}
                aria-hidden="true"
            />
        </div>
    );
}

const selectClasses =
    'w-full appearance-none rounded-md border border-[var(--line)] bg-white py-3 pr-10 pl-4 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal)]/20';

export default function Contact() {
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [formNotice, setFormNotice] = useState('');
    const [sending, setSending] = useState(false);

    const selectedDial = useMemo(
        () =>
            DIAL_CODES.find((entry) => entry.code === form.dialCode) ??
            DIAL_CODES[0],
        [form.dialCode],
    );

    const updateForm = <K extends keyof ContactForm>(
        field: K,
        value: ContactForm[K],
    ) => {
        setForm((current) => ({ ...current, [field]: value }));
        setFormError('');
        setFormNotice('');
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (
            !form.fullName.trim() ||
            !form.subject.trim() ||
            !form.message.trim() ||
            !EMAIL_PATTERN.test(form.email.trim())
        ) {
            setFormError(
                'Please complete your full name, a valid email address, a subject, and a message.',
            );
            setFormNotice('');

            return;
        }

        setSending(true);
        window.setTimeout(() => {
            setSending(false);
            setFormNotice(
                'Thanks for reaching out. We received your message and will get back to you soon.',
            );
            setFormError('');
            setForm(EMPTY_FORM);
        }, 700);
    };

    return (
        <>
            <Head title="Contact Us | OPAP Job Abroad">
                <meta
                    name="description"
                    content="Reach OPAP Job Abroad for account help, job posting support, agency verification, or questions about verified overseas work."
                />
            </Head>

            <section className="contact-hero" aria-labelledby="contact-title">
                <div className="shell">
                    <h1 id="contact-title">
                        Questions before you apply?
                        <br />
                        <em>We&rsquo;re here.</em>
                    </h1>
                    <p className="contact-hero-lede">
                        Reach OPAP Job Abroad for account help, job posting
                        support, or anything else about verified overseas work.
                    </p>
                </div>
            </section>

            <section
                className="contact-section"
                aria-labelledby="contact-form-title"
            >
                <div className="shell contact-grid">
                    <div>
                        <h2 id="contact-form-title" className="contact-heading">
                            Send us a message.
                        </h2>

                        <form
                            className="contact-form"
                            onSubmit={handleSubmit}
                            noValidate
                        >
                            <div className="grid gap-5">
                                <div>
                                    <label
                                        className={authLabelClasses}
                                        htmlFor="contact-role"
                                    >
                                        I am a&hellip;
                                    </label>
                                    <SelectShell>
                                        <select
                                            id="contact-role"
                                            className={selectClasses}
                                            value={form.role}
                                            onChange={(event) =>
                                                updateForm(
                                                    'role',
                                                    event.target.value,
                                                )
                                            }
                                            data-testid="select-contact-role"
                                        >
                                            <option value="">Choose one</option>
                                            {ROLES.map((role) => (
                                                <option key={role} value={role}>
                                                    {role}
                                                </option>
                                            ))}
                                        </select>
                                    </SelectShell>
                                </div>

                                <div>
                                    <label
                                        className={authLabelClasses}
                                        htmlFor="contact-full-name"
                                    >
                                        Full name
                                    </label>
                                    <Input
                                        id="contact-full-name"
                                        autoComplete="name"
                                        value={form.fullName}
                                        onChange={(event) =>
                                            updateForm(
                                                'fullName',
                                                event.target.value,
                                            )
                                        }
                                        data-testid="input-contact-full-name"
                                    />
                                </div>

                                <div>
                                    <label
                                        className={authLabelClasses}
                                        htmlFor="contact-email"
                                    >
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail
                                            size={17}
                                            className="absolute top-1/2 left-4 -translate-y-1/2 text-[var(--teal)]"
                                            aria-hidden="true"
                                        />
                                        <Input
                                            id="contact-email"
                                            type="email"
                                            className="pl-11"
                                            autoComplete="email"
                                            value={form.email}
                                            onChange={(event) =>
                                                updateForm(
                                                    'email',
                                                    event.target.value,
                                                )
                                            }
                                            data-testid="input-contact-email"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        className={authLabelClasses}
                                        htmlFor="contact-phone"
                                    >
                                        Phone number
                                    </label>
                                    <div className="contact-phone-field">
                                        <label
                                            className="sr-only"
                                            htmlFor="contact-dial-code"
                                        >
                                            Country dialling code
                                        </label>
                                        <select
                                            id="contact-dial-code"
                                            className="contact-dial-select"
                                            value={form.dialCode}
                                            onChange={(event) =>
                                                updateForm(
                                                    'dialCode',
                                                    event.target.value,
                                                )
                                            }
                                            aria-label={`Country code: ${selectedDial.name}`}
                                            data-testid="select-contact-dial-code"
                                        >
                                            {DIAL_CODES.map((entry) => (
                                                <option
                                                    key={entry.code}
                                                    value={entry.code}
                                                >
                                                    {entry.name}{' '}
                                                    {entry.dialCode}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="relative min-w-0 flex-1">
                                            <Phone
                                                size={17}
                                                className="absolute top-1/2 left-4 -translate-y-1/2 text-[var(--teal)]"
                                                aria-hidden="true"
                                            />
                                            <input
                                                id="contact-phone"
                                                type="tel"
                                                className="min-h-12 w-full bg-transparent py-3 pr-4 pl-11 text-sm text-[var(--ink)] outline-none"
                                                autoComplete="tel-national"
                                                value={form.phone}
                                                onChange={(event) =>
                                                    updateForm(
                                                        'phone',
                                                        event.target.value,
                                                    )
                                                }
                                                data-testid="input-contact-phone"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label
                                        className={authLabelClasses}
                                        htmlFor="contact-subject"
                                    >
                                        Subject
                                    </label>
                                    <SelectShell>
                                        <select
                                            id="contact-subject"
                                            className={selectClasses}
                                            value={form.subject}
                                            onChange={(event) =>
                                                updateForm(
                                                    'subject',
                                                    event.target.value,
                                                )
                                            }
                                            data-testid="select-contact-subject"
                                        >
                                            <option value="">
                                                Choose a subject
                                            </option>
                                            {SUBJECTS.map((subject) => (
                                                <option
                                                    key={subject}
                                                    value={subject}
                                                >
                                                    {subject}
                                                </option>
                                            ))}
                                        </select>
                                    </SelectShell>
                                </div>

                                <div>
                                    <label
                                        className={authLabelClasses}
                                        htmlFor="contact-message"
                                    >
                                        Message
                                    </label>
                                    <Textarea
                                        id="contact-message"
                                        rows={6}
                                        className="min-h-40 resize-y"
                                        value={form.message}
                                        onChange={(event) =>
                                            updateForm(
                                                'message',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Tell us what you need help with"
                                        data-testid="textarea-contact-message"
                                    />
                                </div>
                            </div>

                            {(formError || formNotice) && (
                                <div
                                    className={cn(
                                        'contact-status',
                                        formError ? 'is-error' : 'is-success',
                                    )}
                                    role="status"
                                    aria-live="polite"
                                    data-testid={
                                        formError
                                            ? 'status-contact-error'
                                            : 'status-contact-success'
                                    }
                                >
                                    {formError ? (
                                        <MessageSquare
                                            size={16}
                                            className="mt-1 shrink-0"
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <Check
                                            size={16}
                                            className="mt-1 shrink-0"
                                            aria-hidden="true"
                                        />
                                    )}
                                    <span>{formError || formNotice}</span>
                                </div>
                            )}

                            <Button
                                type="submit"
                                loading={sending}
                                className="mt-7 w-full sm:w-auto"
                                data-testid="button-contact-submit"
                            >
                                Send message
                                <Send aria-hidden="true" />
                            </Button>
                        </form>
                    </div>

                    <div className="contact-aside">
                        <h2 className="contact-heading">
                            Answers before you have to ask.
                        </h2>
                        <div className="contact-faq">
                            {FAQS.map((faq, index) => {
                                const isOpen = openFaq === index;
                                const answerId = `contact-faq-answer-${index}`;

                                return (
                                    <div
                                        className="contact-faq-item"
                                        key={faq.question}
                                    >
                                        <h3>
                                            <button
                                                type="button"
                                                className="contact-faq-button"
                                                onClick={() =>
                                                    setOpenFaq(
                                                        isOpen ? null : index,
                                                    )
                                                }
                                                aria-expanded={isOpen}
                                                aria-controls={answerId}
                                                data-testid={`button-contact-faq-${index + 1}`}
                                            >
                                                <span>{faq.question}</span>
                                                <ChevronDown
                                                    size={18}
                                                    className={cn(
                                                        'shrink-0 text-[var(--teal)] transition-transform',
                                                        isOpen && 'rotate-180',
                                                    )}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        </h3>
                                        <div
                                            id={answerId}
                                            hidden={!isOpen}
                                            className={cn(
                                                'contact-faq-answer',
                                                isOpen && 'is-open',
                                            )}
                                        >
                                            {faq.answer}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="contact-office">
                            <h3 className="contact-office-title">
                                Our location
                            </h3>
                            <p className="contact-office-address">
                                <MapPin size={15} aria-hidden="true" />
                                Bonifacio Global City, Taguig City, Philippines
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
