import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, Globe, Mail } from 'lucide-react';
import {
    authErrorClasses,
    authInputClasses,
    authLabelClasses,
} from '@/lib/auth-form-styles';
import { home, login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <main className="signin-page min-h-screen bg-[var(--cream)] text-[var(--ink)] lg:flex">
            <Head title="Forgot password" />
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
                    data-testid="link-forgot-brand-home"
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
                                data-testid="link-forgot-return"
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
                            Forgot your password?
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-[var(--slate)]">
                            Enter the email address linked to your account and
                            we&rsquo;ll send you a secure link to choose a new
                            password.
                        </p>
                    </div>

                    {status && (
                        <p
                            className="mb-5 rounded-md border border-[var(--teal)]/30 bg-[var(--teal-light)] px-4 py-3 text-sm font-medium text-[var(--navy)]"
                            role="status"
                            data-testid="status-forgot-password"
                        >
                            {status}
                        </p>
                    )}

                    <Form {...email.form()} className="space-y-5">
                        {({ processing, errors }) => (
                            <>
                                <div>
                                    <label
                                        className={authLabelClasses}
                                        htmlFor="forgot-email"
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
                                            id="forgot-email"
                                            type="email"
                                            name="email"
                                            autoComplete="email"
                                            autoFocus
                                            required
                                            aria-invalid={Boolean(errors.email)}
                                            aria-describedby={
                                                errors.email
                                                    ? 'forgot-email-error'
                                                    : undefined
                                            }
                                            data-testid="input-forgot-email"
                                        />
                                    </div>
                                    {errors.email && (
                                        <p
                                            className={authErrorClasses}
                                            id="forgot-email-error"
                                            role="alert"
                                        >
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                <button
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--amber)] px-5 py-3.5 text-sm font-bold text-[var(--navy)] transition hover:brightness-95 focus-visible:outline-[var(--teal)] disabled:opacity-60"
                                    type="submit"
                                    disabled={processing}
                                    data-test="email-password-reset-link-button"
                                    data-testid="button-forgot-submit"
                                >
                                    {processing
                                        ? 'Sending link…'
                                        : 'Email password reset link'}
                                </button>
                            </>
                        )}
                    </Form>

                    <div className="mt-8 border-t border-[var(--line)] pt-7 text-center">
                        <p className="text-sm text-[var(--slate)]">
                            Remembered it?{' '}
                            <Link
                                className="font-semibold text-[var(--teal)] underline-offset-4 transition hover:text-[var(--navy)] hover:underline"
                                href={login()}
                                data-testid="link-forgot-login"
                            >
                                Return to log in
                            </Link>
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
