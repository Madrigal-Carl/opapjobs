import { Form, Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PasswordField } from '@/components/ui/password-field';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

export default function ResetPassword({ token, email, passwordRules }: Props) {
    return (
        <>
            <Head title="Reset password" />

            <Form
                {...update.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnSuccess={['password', 'password_confirmation']}
            >
                {({ processing, errors }) => (
                    <div className="grid gap-6">
                        <Field
                            id="email"
                            label="Email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={email}
                            readOnly
                            error={errors.email}
                        />

                        <PasswordField
                            id="password"
                            label="Password"
                            name="password"
                            autoComplete="new-password"
                            autoFocus
                            placeholder="Password"
                            passwordrules={passwordRules}
                            error={errors.password}
                        />

                        <PasswordField
                            id="password_confirmation"
                            label="Confirm password"
                            name="password_confirmation"
                            autoComplete="new-password"
                            placeholder="Confirm password"
                            passwordrules={passwordRules}
                            error={errors.password_confirmation}
                        />

                        <Button
                            type="submit"
                            className="w-full"
                            loading={processing}
                            data-test="reset-password-button"
                        >
                            Reset password
                        </Button>
                    </div>
                )}
            </Form>
        </>
    );
}

ResetPassword.layout = {
    title: 'Reset password',
    description: 'Please enter your new password below',
};
