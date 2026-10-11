import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, Globe, Mail } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PasswordField } from '@/components/ui/password-field';
import { home, register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

type SocialProvider = 'Google' | 'Facebook';

export default function Login({ status, canResetPassword }: Props) {
    const [notice, setNotice] = useState('');

    const handleSocialSignIn = (provider: SocialProvider) => {
        setNotice(`${provider} sign-in isn't connected yet — this is a demo.`);
    };

    return (
        <main className="signin-page min-h-screen bg-[var(--cream)] text-[var(--ink)] lg:flex">
            <Head title="Sign in" />
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
                    data-testid="link-signin-brand-home"
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
                                data-testid="link-signin-return"
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
                            Sign in to OPAP Job Abroad
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-[var(--slate)]">
                            Candidates, agencies, and admins all sign in here.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full gap-3 py-3"
                            onClick={() => handleSocialSignIn('Google')}
                            aria-label="Continue with Google"
                            data-testid="button-signin-google"
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
                            onClick={() => handleSocialSignIn('Facebook')}
                            aria-label="Continue with Facebook"
                            data-testid="button-signin-facebook"
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
                        resetOnSuccess={['password']}
                        className="space-y-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <Field
                                    id="signin-email"
                                    label="Email address"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    required
                                    error={errors.email}
                                    icon={<Mail size={17} aria-hidden="true" />}
                                    data-testid="input-signin-email"
                                />

                                <PasswordField
                                    id="signin-password"
                                    label="Password"
                                    name="password"
                                    autoComplete="current-password"
                                    required
                                    error={errors.password}
                                    toggleTestId="button-signin-toggle-password"
                                    data-testid="input-signin-password"
                                />

                                <div className="flex items-center justify-between gap-4 text-sm">
                                    <label className="flex items-center gap-2 text-[var(--slate)]">
                                        <input
                                            className="h-4 w-4 rounded border-[var(--line)] accent-[var(--teal)]"
                                            type="checkbox"
                                            name="remember"
                                            data-testid="checkbox-signin-remember-me"
                                        />
                                        Remember me
                                    </label>
                                    {canResetPassword && (
                                        <Link
                                            className="font-semibold text-[var(--teal)] underline-offset-4 transition hover:text-[var(--navy)] hover:underline"
                                            href={request()}
                                            data-testid="link-signin-forgot-password"
                                        >
                                            Forgot password?
                                        </Link>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={processing}
                                    data-testid="button-signin-submit"
                                >
                                    {processing ? 'Signing in…' : 'Sign in'}
                                </Button>

                                <div
                                    className="min-h-5 text-sm"
                                    role="status"
                                    aria-live="polite"
                                    data-testid="status-signin"
                                >
                                    {notice && (
                                        <p className="rounded-md border border-[var(--teal)]/30 bg-[var(--teal-light)] px-3 py-2.5 font-medium text-[var(--navy)]">
                                            {notice}
                                        </p>
                                    )}
                                    {status && (
                                        <p className="rounded-md border border-[var(--teal)]/30 bg-[var(--teal-light)] px-3 py-2.5 font-medium text-[var(--navy)]">
                                            {status}
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </Form>

                    <div className="mt-8 border-t border-[var(--line)] pt-7 text-center">
                        <p className="text-sm text-[var(--slate)]">
                            New to OPAP?{' '}
                            <Link
                                className="font-semibold text-[var(--teal)] underline-offset-4 transition hover:text-[var(--navy)] hover:underline"
                                href={register()}
                                data-testid="link-signin-create-account"
                            >
                                Create an account
                            </Link>
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
