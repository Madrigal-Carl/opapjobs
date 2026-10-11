import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, Globe, Mail, User } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PasswordField } from '@/components/ui/password-field';
import { home, login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
};

type SocialProvider = 'Google' | 'Facebook';

export default function Register({ passwordRules }: Props) {
    const [notice, setNotice] = useState('');

    const handleSocialSignUp = (provider: SocialProvider) => {
        setNotice(`${provider} sign-up isn't connected yet — this is a demo.`);
    };

    return (
        <main className="signin-page min-h-screen bg-[var(--cream)] text-[var(--ink)] lg:flex">
            <Head title="Create account" />
            <section
                className="signin-photo relative flex min-h-[30vh] flex-1 items-end overflow-hidden px-6 py-7 text-white sm:px-10 sm:py-9 lg:sticky lg:top-0 lg:h-screen lg:w-1/2 lg:self-start lg:px-12 lg:py-12"
                role="img"
                aria-label="A Filipino port worker in a safety helmet looking across a working harbor"
            >
                <div
                    className="signin-photo-wash absolute inset-0"
                    aria-hidden="true"
                />
                <Link
                    className="brand relative z-10 w-fit"
                    href={home()}
                    aria-label="OPAP Job Abroad home"
                    data-testid="link-signup-brand-home"
                >
                    <Globe
                        className="brand-globe"
                        size={25}
                        strokeWidth={1.8}
                        aria-hidden="true"
                    />
                    <span className="brand-name">OPAP Job Abroad</span>
                </Link>
                <div className="relative z-10 ml-auto hidden max-w-[410px] pb-1 lg:block">
                    <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[var(--amber)] uppercase">
                        A clearer path forward
                    </p>
                    <p className="mt-4 font-serif text-4xl leading-[1.02] font-bold tracking-[-0.06em]">
                        Overseas jobs you can verify before you apply.
                    </p>
                </div>
            </section>

            <section className="flex flex-1 items-center bg-[var(--cream)] px-6 py-10 sm:px-12 sm:py-14 lg:min-h-screen lg:w-1/2 lg:px-16 xl:px-20">
                <div className="mx-auto w-full max-w-[480px]">
                    <div className="mb-8">
                        <div className="mb-4 flex items-center gap-3 font-mono text-[10px] font-bold tracking-[0.16em] text-[var(--teal)] uppercase">
                            <Link
                                className="inline-flex items-center gap-1.5 transition hover:underline hover:underline-offset-4"
                                href={home()}
                                data-testid="link-signup-return"
                            >
                                <ArrowLeft
                                    size={14}
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                                RETURN
                            </Link>
                        </div>
                        <h1 className="font-serif text-3xl font-bold tracking-[-0.05em] text-[var(--navy)] sm:text-[40px]">
                            Create your OPAP account
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-[var(--slate)]">
                            One account to save roles, track applications, and
                            apply with a verified profile.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full gap-3 py-3"
                            onClick={() => handleSocialSignUp('Google')}
                            aria-label="Continue with Google"
                            data-testid="button-signup-google"
                        >
                            <img
                                src="/images/google-icon.svg"
                                alt=""
                                aria-hidden="true"
                                className="h-4 w-4"
                            />
                            Continue with Google
                        </Button>
                        <Button
                            type="button"
                            variant="facebook"
                            className="w-full gap-3 py-3"
                            onClick={() => handleSocialSignUp('Facebook')}
                            aria-label="Continue with Facebook"
                            data-testid="button-signup-facebook"
                        >
                            <img
                                src="/images/facebook-icon.svg"
                                alt=""
                                aria-hidden="true"
                                className="h-4 w-4"
                            />
                            Continue with Facebook
                        </Button>
                    </div>

                    <div className="my-7 flex items-center gap-4 text-[10px] font-bold tracking-[0.14em] text-[var(--slate)] uppercase">
                        <span className="h-px flex-1 bg-[var(--line)]" />
                        <span>or continue with email</span>
                        <span className="h-px flex-1 bg-[var(--line)]" />
                    </div>

                    <Form
                        {...store.form()}
                        resetOnSuccess={['password', 'password_confirmation']}
                        className="space-y-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <Field
                                    id="signup-full-name"
                                    label="Full name"
                                    type="text"
                                    name="name"
                                    autoComplete="name"
                                    required
                                    error={errors.name}
                                    icon={<User size={17} aria-hidden="true" />}
                                    data-testid="input-signup-full-name"
                                />

                                <Field
                                    id="signup-email"
                                    label="Email address"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    required
                                    error={errors.email}
                                    icon={<Mail size={17} aria-hidden="true" />}
                                    data-testid="input-signup-email"
                                />

                                <PasswordField
                                    id="signup-password"
                                    label="Password"
                                    name="password"
                                    autoComplete="new-password"
                                    required
                                    passwordrules={passwordRules}
                                    error={errors.password}
                                    toggleTestId="button-signup-toggle-password"
                                    data-testid="input-signup-password"
                                />

                                <PasswordField
                                    id="signup-confirm-password"
                                    label="Confirm password"
                                    name="password_confirmation"
                                    autoComplete="new-password"
                                    required
                                    error={errors.password_confirmation}
                                    toggleTestId="button-signup-toggle-confirm-password"
                                    data-testid="input-signup-confirm-password"
                                />

                                <div className="text-sm">
                                    <label className="flex items-start gap-2.5 text-[var(--slate)]">
                                        <input
                                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--line)] accent-[var(--teal)]"
                                            type="checkbox"
                                            name="terms"
                                            required
                                            data-testid="checkbox-signup-terms"
                                        />
                                        <span>
                                            I agree to the Terms of Service and
                                            Privacy Policy
                                        </span>
                                    </label>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={processing}
                                    data-testid="button-signup-submit"
                                >
                                    {processing
                                        ? 'Creating account…'
                                        : 'Create account'}
                                </Button>

                                <div
                                    className="min-h-5 text-sm"
                                    role="status"
                                    aria-live="polite"
                                    data-testid="status-signup"
                                >
                                    {notice && (
                                        <p className="rounded-md border border-[var(--teal)]/30 bg-[var(--teal-light)] px-3 py-2.5 font-medium text-[var(--navy)]">
                                            {notice}
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </Form>

                    <div className="mt-8 border-t border-[var(--line)] pt-7 text-center">
                        <p className="text-sm text-[var(--slate)]">
                            Already have an account?{' '}
                            <Link
                                className="font-semibold text-[var(--teal)] underline-offset-4 transition hover:text-[var(--navy)] hover:underline"
                                href={login()}
                                data-testid="link-signup-signin"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
