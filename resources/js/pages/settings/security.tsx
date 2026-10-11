import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import Heading from '@/components/heading';
import ManageTwoFactor from '@/components/manage-two-factor';
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import { edit } from '@/routes/security';

// oxfmt-ignore
type Props = {
    passwordRules: string;
} &
    ManageTwoFactorProps;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Security settings" />

            <h1 className="sr-only">Security settings</h1>

            <section className="rounded-lg border border-[var(--line)] bg-white p-6">
                <Heading
                    variant="small"
                    title="Update password"
                    description="Ensure your account is using a long, random password to stay secure"
                />

                <Form
                    {...SecurityController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) {
                            passwordInput.current?.focus();
                        }

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className="mt-6 space-y-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <PasswordField
                                id="current_password"
                                label="Current password"
                                name="current_password"
                                ref={currentPasswordInput}
                                autoComplete="current-password"
                                error={errors.current_password}
                            />

                            <PasswordField
                                id="password"
                                label="New password"
                                name="password"
                                ref={passwordInput}
                                autoComplete="new-password"
                                passwordrules={props.passwordRules}
                                error={errors.password}
                            />

                            <PasswordField
                                id="password_confirmation"
                                label="Confirm password"
                                name="password_confirmation"
                                autoComplete="new-password"
                                passwordrules={props.passwordRules}
                                error={errors.password_confirmation}
                            />

                            <div className="flex items-center gap-4 pt-1">
                                <Button
                                    type="submit"
                                    loading={processing}
                                    data-test="update-password-button"
                                >
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </section>

            <ManageTwoFactor {...props} />
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: 'Security settings',
            href: edit(),
        },
    ],
};
