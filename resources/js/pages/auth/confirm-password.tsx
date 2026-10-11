import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/password/confirm';

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Confirm password" />

            <div className="flex flex-1 items-center justify-center p-4">
                <Card className="w-full max-w-md gap-0 px-6 py-8">
                    <div className="mb-6 space-y-1 text-center">
                        <h1 className="text-xl font-semibold tracking-tight">
                            Confirm password
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            This is a secure area of the application. Please
                            confirm your password before continuing.
                        </p>
                    </div>

                    <Form {...store.form()} resetOnSuccess={['password']}>
                        {({ processing, errors }) => (
                            <div className="space-y-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        placeholder="Password"
                                        autoComplete="current-password"
                                        autoFocus
                                    />

                                    <InputError message={errors.password} />
                                </div>

                                <Button
                                    className="w-full"
                                    disabled={processing}
                                    data-test="confirm-password-button"
                                >
                                    {processing && <Spinner />}
                                    Confirm password
                                </Button>
                            </div>
                        )}
                    </Form>
                </Card>
            </div>
        </>
    );
}
