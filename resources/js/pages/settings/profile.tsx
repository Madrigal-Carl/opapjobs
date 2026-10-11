import { Form, Head, Link, usePage } from '@inertiajs/react';
import { Mail, User } from 'lucide-react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <section className="rounded-lg border border-[var(--line)] bg-white p-6">
                <Heading
                    variant="small"
                    title="Profile information"
                    description="Update your name and email address"
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="mt-6 space-y-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <Field
                                id="name"
                                label="Name"
                                name="name"
                                defaultValue={auth.user.name}
                                required
                                autoComplete="name"
                                placeholder="Full name"
                                error={errors.name}
                                icon={<User size={17} aria-hidden="true" />}
                            />

                            <Field
                                id="email"
                                label="Email address"
                                type="email"
                                name="email"
                                defaultValue={auth.user.email}
                                required
                                autoComplete="email"
                                placeholder="Email address"
                                error={errors.email}
                                icon={<Mail size={17} aria-hidden="true" />}
                            />

                            {mustVerifyEmail &&
                                !auth.user.email_verified_at && (
                                    <div className="rounded-md border border-[var(--teal)]/30 bg-[var(--teal-light)] px-4 py-3 text-sm text-[var(--navy)]">
                                        <p>
                                            Your email address is unverified.{' '}
                                            <Link
                                                className="font-semibold text-[var(--teal)] underline underline-offset-4 transition hover:text-[var(--navy)]"
                                                href={send()}
                                                as="button"
                                            >
                                                Re-send the verification email.
                                            </Link>
                                        </p>
                                        {status ===
                                            'verification-link-sent' && (
                                            <p className="mt-1 font-medium">
                                                A new verification link has been
                                                sent to your email address.
                                            </p>
                                        )}
                                    </div>
                                )}

                            <div className="flex items-center gap-4 pt-1">
                                <Button
                                    type="submit"
                                    loading={processing}
                                    data-test="update-profile-button"
                                >
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </section>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
