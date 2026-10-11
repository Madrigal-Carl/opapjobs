import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Eye,
    EyeOff,
    Facebook,
    Globe,
    LockKeyhole,
    Mail,
    User,
} from 'lucide-react';
import { useState } from 'react';
import { GoogleIcon } from '@/components/site/google-icon';
import {
    authErrorClasses,
    authInputClasses,
    authLabelClasses,
} from '@/lib/auth-form-styles';
import { home, login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
};

type SocialProvider = 'Google' | 'Facebook';

export default function Register({ passwordRules }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
                        <button
                            className="inline-flex w-full items-center justify-center gap-3 rounded-md border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--navy)] transition hover:border-[var(--teal)] hover:bg-white focus-visible:outline-[var(--teal)]"
                            type="button"
                            onClick={() => handleSocialSignUp('Google')}
                            aria-label="Continue with Google"
                            data-testid="button-signup-google"
                        >
                            <GoogleIcon />
                            Continue with Google
                        </button>
                        <button
                            className="inline-flex w-full items-center justify-center gap-3 rounded-md bg-[#1877f2] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-[var(--teal)]"
                            type="button"
                            onClick={() => handleSocialSignUp('Facebook')}
                            aria-label="Continue with Facebook"
                            data-testid="button-signup-facebook"
                        >
                            <Facebook
                                size={18}
                                fill="currentColor"
                                aria-hidden="true"
                            />
                            Continue with Facebook
                        </button>
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
                                <div>
                                    <label
                                        className={authLabelClasses}
                                        htmlFor="signup-full-name"
                                    >
                                        Full name
                                    </label>
                                    <div className="relative">
                                        <User
                                            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--teal)]"
                                            size={17}
                                            aria-hidden="true"
                                        />
                                        <input
                                            className={`${authInputClasses} pl-11`}
                                            id="signup-full-name"
                                            type="text"
                                            name="name"
                                            autoComplete="name"
                                            aria-invalid={Boolean(errors.name)}
                                            aria-describedby={
                                                errors.name
                                                    ? 'signup-full-name-error'
                                                    : undefined
                                            }
                                            required
                                            data-testid="input-signup-full-name"
                                        />
                                    </div>
                                    {errors.name && (
                                        <p
                                            className={authErrorClasses}
                                            id="signup-full-name-error"
                                            role="alert"
                                        >
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        className={authLabelClasses}
                                        htmlFor="signup-email"
                                    >
                                        Email address
                                    </label>
                                    <div className="relative">
                                        <Mail
                                            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--teal)]"
                                            size={17}
                                            aria-hidden="true"
                                        />
                                        <input
                                            className={`${authInputClasses} pl-11`}
                                            id="signup-email"
                                            type="email"
                                            name="email"
                                            autoComplete="email"
                                            aria-invalid={Boolean(errors.email)}
                                            aria-describedby={
                                                errors.email
                                                    ? 'signup-email-error'
                                                    : undefined
                                            }
                                            required
                                            data-testid="input-signup-email"
                                        />
                                    </div>
                                    {errors.email && (
                                        <p
                                            className={authErrorClasses}
                                            id="signup-email-error"
                                            role="alert"
                                        >
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        className={authLabelClasses}
                                        htmlFor="signup-password"
                                    >
                                        Password
                                    </label>
                                    <div className="relative">
                                        <LockKeyhole
                                            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--teal)]"
                                            size={17}
                                            aria-hidden="true"
                                        />
                                        <input
                                            className={`${authInputClasses} pr-12 pl-11`}
                                            id="signup-password"
                                            type={
                                                showPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            name="password"
                                            autoComplete="new-password"
                                            aria-invalid={Boolean(
                                                errors.password,
                                            )}
                                            aria-describedby={
                                                errors.password
                                                    ? 'signup-password-error'
                                                    : undefined
                                            }
                                            required
                                            passwordrules={passwordRules}
                                            data-testid="input-signup-password"
                                        />
                                        <button
                                            className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-[var(--slate)] transition hover:text-[var(--navy)]"
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(
                                                    (current) => !current,
                                                )
                                            }
                                            aria-label={
                                                showPassword
                                                    ? 'Hide password'
                                                    : 'Show password'
                                            }
                                            aria-pressed={showPassword}
                                            data-testid="button-signup-toggle-password"
                                        >
                                            {showPassword ? (
                                                <EyeOff
                                                    size={18}
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <Eye
                                                    size={18}
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p
                                            className={authErrorClasses}
                                            id="signup-password-error"
                                            role="alert"
                                        >
                                            {errors.password}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        className={authLabelClasses}
                                        htmlFor="signup-confirm-password"
                                    >
                                        Confirm password
                                    </label>
                                    <div className="relative">
                                        <LockKeyhole
                                            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--teal)]"
                                            size={17}
                                            aria-hidden="true"
                                        />
                                        <input
                                            className={`${authInputClasses} pr-12 pl-11`}
                                            id="signup-confirm-password"
                                            type={
                                                showConfirmPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            name="password_confirmation"
                                            autoComplete="new-password"
                                            aria-invalid={Boolean(
                                                errors.password_confirmation,
                                            )}
                                            aria-describedby={
                                                errors.password_confirmation
                                                    ? 'signup-confirm-password-error'
                                                    : undefined
                                            }
                                            required
                                            data-testid="input-signup-confirm-password"
                                        />
                                        <button
                                            className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-[var(--slate)] transition hover:text-[var(--navy)]"
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    (current) => !current,
                                                )
                                            }
                                            aria-label={
                                                showConfirmPassword
                                                    ? 'Hide confirm password'
                                                    : 'Show confirm password'
                                            }
                                            aria-pressed={showConfirmPassword}
                                            data-testid="button-signup-toggle-confirm-password"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff
                                                    size={18}
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <Eye
                                                    size={18}
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </button>
                                    </div>
                                    {errors.password_confirmation && (
                                        <p
                                            className={authErrorClasses}
                                            id="signup-confirm-password-error"
                                            role="alert"
                                        >
                                            {errors.password_confirmation}
                                        </p>
                                    )}
                                </div>

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

                                <button
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--amber)] px-5 py-3.5 text-sm font-bold text-[var(--navy)] transition hover:brightness-95 focus-visible:outline-[var(--teal)] disabled:opacity-60"
                                    type="submit"
                                    disabled={processing}
                                    data-testid="button-signup-submit"
                                >
                                    {processing
                                        ? 'Creating account…'
                                        : 'Create account'}
                                </button>

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
