import { Head, usePage } from '@inertiajs/react';
import { ArrowRight, Check, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { CONTACT_DESKS, CONTACT_DETAILS, CONTACT_FAQS } from '@/data/contact';
import { index as jobsIndex } from '@/routes/jobs';

/** The subjects the form offers, so a message arrives already routed. */
const SUBJECTS = [
    'An application I sent',
    'An agency or employer listing',
    'My account or my resume',
    'Something looks wrong on this site',
    'Something else',
] as const;

/**
 * Contact.
 *
 * The page exists to answer the questions that stop someone applying, so
 * the FAQ is the larger half and is readable without filling anything in.
 * The form is deliberately short and asks for a topic rather than a
 * free-text one, because almost every message lands on one of the desks
 * below and the reader should be able to self-route before sending.
 */
export default function Contact() {
    const { props } = usePage();
    const user = props.auth.user;

    return (
        <>
            <Head>
                <title>
                    Contact OPAP Job Abroad — applications, agencies and support
                </title>
            </Head>

            <section className="contact-hero">
                <div className="shell contact-hero-inner">
                    <div>
                        <div className="eyebrow">
                            <span className="eyebrow-rule" /> CONTACT
                        </div>
                        <h1>
                            Ask before you apply,
                            <br />
                            <em>not after.</em>
                        </h1>
                    </div>
                    <p>
                        Most questions are answered on this page. If yours is
                        not, send it to the desk that handles it — you will not
                        be passed between three people.
                    </p>
                </div>
            </section>

            <section className="contact-body">
                <div className="shell">
                    <div className="contact-columns">
                        <div>
                            <div className="contact-card">
                                <h2>Send us a message</h2>
                                <p className="contact-lede">
                                    Tell us what it is about and we will route
                                    it. We reply within one working day.
                                </p>
                                <ContactForm
                                    defaultEmail={user?.email ?? ''}
                                    signedIn={Boolean(user)}
                                />
                            </div>

                            <div className="contact-card">
                                <h3 className="contact-card-title">
                                    Reach a desk directly
                                </h3>
                                <div className="contact-desks">
                                    {CONTACT_DESKS.map(
                                        ({
                                            id,
                                            label,
                                            email,
                                            phone,
                                            icon: Icon,
                                            blurb,
                                        }) => (
                                            <div
                                                className="contact-desk"
                                                key={id}
                                            >
                                                <span className="contact-desk-icon">
                                                    <Icon
                                                        size={16}
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                                <div>
                                                    <p className="contact-desk-label">
                                                        {label}
                                                    </p>
                                                    <p className="contact-desk-blurb">
                                                        {blurb}
                                                    </p>
                                                    <p className="contact-desk-links">
                                                        <a
                                                            href={`mailto:${email}`}
                                                        >
                                                            {email}
                                                        </a>
                                                        <span aria-hidden="true">
                                                            ·
                                                        </span>
                                                        <a
                                                            href={`tel:${phone.replaceAll(
                                                                ' ',
                                                                '',
                                                            )}`}
                                                        >
                                                            {phone}
                                                        </a>
                                                    </p>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>

                                <dl className="contact-details">
                                    <div>
                                        <dt>Office</dt>
                                        <dd>{CONTACT_DETAILS.address}</dd>
                                    </div>
                                    <div>
                                        <dt>Hours</dt>
                                        <dd>{CONTACT_DETAILS.hours}</dd>
                                    </div>
                                    <div>
                                        <dt>General</dt>
                                        <dd>
                                            <a
                                                href={`mailto:${CONTACT_DETAILS.email}`}
                                            >
                                                {CONTACT_DETAILS.email}
                                            </a>{' '}
                                            ·{' '}
                                            <a
                                                href={`tel:${CONTACT_DETAILS.phone.replaceAll(
                                                    ' ',
                                                    '',
                                                )}`}
                                            >
                                                {CONTACT_DETAILS.phone}
                                            </a>
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        <aside className="contact-faq">
                            <h2>Answered before you ask</h2>
                            <ul>
                                {CONTACT_FAQS.map(
                                    ({ id, question, answer }) => (
                                        <li key={id}>
                                            <details
                                                data-testid={`faq-${id}`}
                                                name="contact-faq"
                                            >
                                                <summary>{question}</summary>
                                                <p>{answer}</p>
                                            </details>
                                        </li>
                                    ),
                                )}
                            </ul>

                            <div className="contact-cta">
                                <p className="contact-cta-title">
                                    Ready to look at real openings?
                                </p>
                                <p className="contact-cta-body">
                                    Every listing here names the accredited
                                    agency handling it.
                                </p>
                                <Button asChild size="sm">
                                    <a href={jobsIndex.url()}>
                                        Browse verified jobs{' '}
                                        <ArrowRight
                                            size={14}
                                            aria-hidden="true"
                                        />
                                    </a>
                                </Button>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>
        </>
    );
}

type ContactFormProps = {
    defaultEmail: string;
    signedIn: boolean;
};

/**
 * The message form.
 *
 * There is no endpoint yet, so submitting shows what would have been sent
 * rather than pretending a message was delivered. That honesty matters more
 * than a fake success state: an applicant who believes they reported a
 * fraudulent listing will not report it anywhere else.
 */
function ContactForm({ defaultEmail, signedIn }: ContactFormProps) {
    const [subject, setSubject] = useState<string>(SUBJECTS[0]);
    const [name, setName] = useState(defaultEmail ? '' : '');
    const [email, setEmail] = useState(defaultEmail);
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(false);

    if (sent) {
        return (
            <div
                className="contact-sent"
                role="status"
                data-testid="contact-sent"
            >
                <Check
                    size={20}
                    className="text-[var(--teal)]"
                    aria-hidden="true"
                />
                <h3>Here is what would be sent</h3>
                <p className="contact-sent-note">
                    There is no inbox behind this form yet, so nothing was
                    actually delivered. Write to{' '}
                    <a href={`mailto:${CONTACT_DETAILS.email}`}>
                        {CONTACT_DETAILS.email}
                    </a>{' '}
                    with these details and it will reach the right desk.
                </p>

                <dl className="contact-sent-summary">
                    <div>
                        <dt>To</dt>
                        <dd>{deskFor(subject).label}</dd>
                    </div>
                    <div>
                        <dt>Subject</dt>
                        <dd>{subject}</dd>
                    </div>
                    {name && (
                        <div>
                            <dt>From</dt>
                            <dd>{name}</dd>
                        </div>
                    )}
                    <div>
                        <dt>Email</dt>
                        <dd>{email || 'Not given'}</dd>
                    </div>
                    <div>
                        <dt>Message</dt>
                        <dd>{message}</dd>
                    </div>
                </dl>

                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSent(false)}
                    data-testid="button-contact-back"
                >
                    Edit the message
                </Button>
            </div>
        );
    }

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // A guest who leaves the address blank has nothing to reply to, so
        // the form is never submitted in that state.
        if (!message.trim()) {
            toast('Add a message first', {
                description: 'Even one line helps us route it.',
            });

            return;
        }

        setSent(true);
    };

    return (
        <form className="contact-form" onSubmit={submit}>
            <div className="field">
                <label className="field-label" htmlFor="contact-subject">
                    What is this about?
                </label>
                <select
                    id="contact-subject"
                    className="field-control"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    data-testid="select-contact-subject"
                >
                    {SUBJECTS.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
                <p className="field-hint">
                    Goes to {deskFor(subject).label.toLowerCase()}.
                </p>
            </div>

            {!signedIn && (
                <div className="field-row">
                    <div className="field">
                        <label className="field-label" htmlFor="contact-name">
                            Your name
                        </label>
                        <input
                            id="contact-name"
                            type="text"
                            className="field-control"
                            value={name}
                            placeholder="Optional"
                            onChange={(event) => setName(event.target.value)}
                            data-testid="input-contact-name"
                        />
                    </div>
                </div>
            )}

            <div className="field">
                <label className="field-label" htmlFor="contact-email">
                    {signedIn ? 'Sending as' : 'Your email'}
                </label>
                <input
                    id="contact-email"
                    type="email"
                    className="field-control"
                    value={email}
                    readOnly={signedIn}
                    placeholder="you@example.com"
                    onChange={(event) => setEmail(event.target.value)}
                    data-testid="input-contact-email"
                />
                {signedIn && (
                    <p className="field-hint">
                        Signed in as this account. Message us from another
                        address using{' '}
                        <a href={`mailto:${CONTACT_DETAILS.email}`}>
                            {CONTACT_DETAILS.email}
                        </a>
                        .
                    </p>
                )}
            </div>

            <div className="field">
                <label className="field-label" htmlFor="contact-message">
                    Your message
                </label>
                <Textarea
                    id="contact-message"
                    className="field-control"
                    rows={6}
                    value={message}
                    placeholder="Include the job title or agency if it is about a listing."
                    onChange={(event) => setMessage(event.target.value)}
                    data-testid="input-contact-message"
                />
            </div>

            <Button type="submit" data-testid="button-contact-send">
                Review the message <Send size={14} aria-hidden="true" />
            </Button>
        </form>
    );
}

/** The desk a subject belongs to, so the hint never lies. */
function deskFor(subject: string) {
    if (subject.includes('agency') || subject.includes('listing')) {
        return (
            CONTACT_DESKS.find((desk) => desk.id === 'verification') ??
            CONTACT_DESKS[0]
        );
    }

    if (subject.includes('account') || subject.includes('resume')) {
        return (
            CONTACT_DESKS.find((desk) => desk.id === 'support') ??
            CONTACT_DESKS[0]
        );
    }

    return (
        CONTACT_DESKS.find((desk) => desk.id === 'applications') ??
        CONTACT_DESKS[0]
    );
}
