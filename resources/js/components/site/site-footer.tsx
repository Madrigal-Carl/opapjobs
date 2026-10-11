import {
    Bell,
    Clock3,
    Globe,
    Linkedin,
    LockKeyhole,
    Mail,
    MapPin,
    Phone,
    Send,
    ShieldCheck,
    UsersRound,
    Youtube,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Brand } from '@/components/site/brand';

export function SiteFooter() {
    const [email, setEmail] = useState('');
    const [newsletterNotice, setNewsletterNotice] = useState('');

    const handleSubscribe = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!email.trim() || !email.includes('@')) {
            setNewsletterNotice('Enter a valid email address to subscribe.');
            return;
        }
        setNewsletterNotice(
            'You’re on the list. We’ll send the next verified job digest your way.',
        );
        setEmail('');
    };

    return (
        <footer className="site-footer" id="saved">
            <div className="shell footer-top">
                <div className="footer-brand">
                    <Brand
                        className="brand-footer"
                        testId="link-footer-brand"
                    />
                    <p>
                        Clearer paths to verified work abroad for Filipino
                        jobseekers.
                    </p>
                    <div className="footer-socials">
                        <a
                            href="/#top"
                            aria-label="OPAP on LinkedIn"
                            data-testid="link-social-linkedin"
                        >
                            <Linkedin size={17} />
                        </a>
                        <a
                            href="/#top"
                            aria-label="OPAP on YouTube"
                            data-testid="link-social-youtube"
                        >
                            <Youtube size={18} />
                        </a>
                    </div>
                </div>
                <div className="footer-links">
                    <div>
                        <strong>Explore</strong>
                        <a href="/#jobs">Find a job</a>
                        <a href="/agencies">Agencies</a>
                        <a href="/#resources">Resources</a>
                    </div>
                    <div>
                        <strong>For jobseekers</strong>
                        <a href="/#resources">Applicant guide</a>
                        <a href="/#resources">Know your rights</a>
                        <a href="/#newsletter">Job alerts</a>
                    </div>
                    <div>
                        <strong>About OPAP</strong>
                        <a href="/#trust">Why OPAP</a>
                        <a href="/agencies">Accreditation</a>
                        <a href="/contact">Contact us</a>
                    </div>
                </div>
            </div>
            <div className="footer-newsletter-wrap" id="newsletter">
                <div className="shell newsletter-card">
                    <div className="newsletter-icon">
                        <Bell size={21} aria-hidden="true" />
                    </div>
                    <div className="newsletter-copy">
                        <div className="eyebrow eyebrow-light">
                            <span className="eyebrow-rule" /> STAY IN THE LOOP
                        </div>
                        <h2>
                            The right opening,
                            <br />
                            <em>at the right time.</em>
                        </h2>
                        <p>
                            One useful email when new verified roles match what
                            you’re looking for. No noise. Unsubscribe anytime.
                        </p>
                    </div>
                    <form
                        className="newsletter-form"
                        onSubmit={handleSubscribe}
                    >
                        <label htmlFor="newsletter-email">
                            Your email address
                        </label>
                        <div className="newsletter-input-row">
                            <input
                                id="newsletter-email"
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                placeholder="you@example.com"
                                data-testid="input-newsletter-email"
                            />
                            <button
                                type="submit"
                                data-testid="button-newsletter-subscribe"
                            >
                                Subscribe <Send size={16} />
                            </button>
                        </div>
                        {newsletterNotice && (
                            <div
                                className="newsletter-notice"
                                role="status"
                                data-testid="status-newsletter"
                            >
                                {newsletterNotice}
                            </div>
                        )}
                    </form>
                </div>
            </div>
            <div
                className="shell footer-trust-row"
                aria-label="OPAP trust commitments"
            >
                <div>
                    <ShieldCheck size={18} aria-hidden="true" />
                    <span>
                        <strong>DMW-aware</strong> listings
                    </span>
                </div>
                <div>
                    <LockKeyhole size={18} aria-hidden="true" />
                    <span>
                        <strong>Private</strong> by default
                    </span>
                </div>
                <div>
                    <UsersRound size={18} aria-hidden="true" />
                    <span>
                        <strong>Made for</strong> Filipino jobseekers
                    </span>
                </div>
                <div>
                    <Globe size={18} aria-hidden="true" />
                    <span>
                        <strong>Work</strong> across borders
                    </span>
                </div>
            </div>
            <div className="shell footer-contact-row">
                <div>
                    <MapPin size={15} aria-hidden="true" />
                    <span>Manila, Philippines</span>
                </div>
                <div>
                    <Phone size={15} aria-hidden="true" />
                    <a href="tel:+63288123456">+63 2 8812 3456</a>
                </div>
                <div>
                    <Mail size={15} aria-hidden="true" />
                    <a href="mailto:hello@opapjobabroad.ph">
                        hello@opapjobabroad.ph
                    </a>
                </div>
                <div>
                    <Clock3 size={15} aria-hidden="true" />
                    <span>Mon–Fri, 9:00–18:00 PHT</span>
                </div>
            </div>
            <div className="shell footer-bottom">
                <span>© 2025 OPAP Job Abroad</span>
                <span>A product for people going places.</span>
                <div>
                    <a href="/#top">Privacy</a>
                    <a href="/#top">Terms</a>
                    <a href="/#top">Accessibility</a>
                </div>
            </div>
        </footer>
    );
}
