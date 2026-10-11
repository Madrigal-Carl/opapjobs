import { Form, Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PasswordField } from '@/components/ui/password-field';
import { store } from '@/routes/password/confirm';

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Confirm password" />

            <div className="flex flex-1 items-center justify-center p-4">
                <Card className="w-full max-w-md p-6">
                    <div className="mb-6">
                        <h2 className="font-serif text-2xl font-bold tracking-[-0.02em] text-[var(--navy)]">
                            Confirm password
                        </h2>
                        <p className="mt-1 text-sm text-[var(--slate)]">
                            This is a secure area of the application. Please
                            confirm your password before continuing.
                        </p>
                    </div>

                    <Form {...store.form()} className="space-y-6">
                        {({ processing, errors }) => (
                            <>
                                <PasswordField
                                    id="password"
                                    label="Password"
                                    name="password"
                                    autoComplete="current-password"
                                    autoFocus
                                    placeholder="Password"
                                    error={errors.password}
                                />

                                <Button
                                    type="submit"
                                    className="w-full"
                                    loading={processing}
                                    data-test="confirm-password-button"
                                >
                                    Confirm password
                                </Button>
                            </>
                        )}
                    </Form>
                </Card>
            </div>
        </>
    );
}
