import { Form } from '@inertiajs/react';
import { Eye, EyeOff, LockKeyhole, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AlertError from '@/components/alert-error';
import { Button } from '@/components/ui/button';
import { regenerateRecoveryCodes } from '@/routes/two-factor';

type Props = {
    recoveryCodesList: string[];
    fetchRecoveryCodes: () => Promise<void>;
    errors: string[];
};

export default function TwoFactorRecoveryCodes({
    recoveryCodesList,
    fetchRecoveryCodes,
    errors,
}: Props) {
    const [codesAreVisible, setCodesAreVisible] = useState<boolean>(false);
    const codesSectionRef = useRef<HTMLDivElement | null>(null);
    const canRegenerateCodes = recoveryCodesList.length > 0 && codesAreVisible;

    const toggleCodesVisibility = useCallback(async () => {
        if (!codesAreVisible && !recoveryCodesList.length) {
            await fetchRecoveryCodes();
        }

        setCodesAreVisible(!codesAreVisible);

        if (!codesAreVisible) {
            setTimeout(() => {
                codesSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            });
        }
    }, [codesAreVisible, recoveryCodesList.length, fetchRecoveryCodes]);

    useEffect(() => {
        if (!recoveryCodesList.length) {
            void fetchRecoveryCodes();
        }
    }, [recoveryCodesList.length, fetchRecoveryCodes]);

    const RecoveryCodeIconComponent = codesAreVisible ? EyeOff : Eye;

    return (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)]/40 p-4">
            <div className="flex items-center gap-2 font-semibold text-[var(--navy)]">
                <LockKeyhole className="size-4" aria-hidden="true" />
                2FA recovery codes
            </div>
            <p className="mt-1 text-sm text-[var(--slate)]">
                Recovery codes let you regain access if you lose your 2FA
                device. Store them in a secure password manager.
            </p>

            <div className="mt-4 flex flex-col gap-3 select-none sm:flex-row sm:items-center sm:justify-between">
                <Button
                    variant="secondary"
                    onClick={toggleCodesVisibility}
                    className="w-fit"
                    aria-expanded={codesAreVisible}
                    aria-controls="recovery-codes-section"
                >
                    <RecoveryCodeIconComponent
                        className="size-4"
                        aria-hidden="true"
                    />
                    {codesAreVisible ? 'Hide' : 'View'} recovery codes
                </Button>

                {canRegenerateCodes && (
                    <Form
                        {...regenerateRecoveryCodes.form()}
                        options={{ preserveScroll: true }}
                        onSuccess={fetchRecoveryCodes}
                    >
                        {({ processing }) => (
                            <Button
                                variant="secondary"
                                type="submit"
                                disabled={processing}
                                aria-describedby="regenerate-warning"
                            >
                                <RefreshCw /> Regenerate codes
                            </Button>
                        )}
                    </Form>
                )}
            </div>

            <div
                id="recovery-codes-section"
                className={`relative overflow-hidden transition-all duration-300 ${codesAreVisible ? 'h-auto opacity-100' : 'h-0 opacity-0'}`}
                aria-hidden={!codesAreVisible}
            >
                <div className="mt-3 space-y-3">
                    {errors?.length ? (
                        <AlertError errors={errors} />
                    ) : (
                        <>
                            <div
                                ref={codesSectionRef}
                                className="grid gap-1 rounded-md border border-[var(--line)] bg-white p-4 font-mono text-sm text-[var(--navy)]"
                                role="list"
                                aria-label="Recovery codes"
                            >
                                {recoveryCodesList.length ? (
                                    recoveryCodesList.map((code, index) => (
                                        <div
                                            key={index}
                                            role="listitem"
                                            className="select-text"
                                        >
                                            {code}
                                        </div>
                                    ))
                                ) : (
                                    <div
                                        className="space-y-2"
                                        aria-label="Loading recovery codes"
                                    >
                                        {Array.from(
                                            { length: 8 },
                                            (_, index) => (
                                                <div
                                                    key={index}
                                                    className="h-4 animate-pulse rounded bg-[var(--line)]"
                                                    aria-hidden="true"
                                                />
                                            ),
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="text-xs text-[var(--slate)] select-none">
                                <p id="regenerate-warning">
                                    Each recovery code can be used once to
                                    access your account and will be removed
                                    after use. If you need more, click{' '}
                                    <span className="font-bold">
                                        Regenerate codes
                                    </span>{' '}
                                    above.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
