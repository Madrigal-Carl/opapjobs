export function ApplyTag({ required = false }: { required?: boolean }) {
    return (
        <span className={`apply-field-tag ${required ? 'is-required' : ''}`}>
            {required ? (
                <>
                    <span aria-hidden="true">*</span>
                    <span className="sr-only">Required</span>
                </>
            ) : (
                '(optional)'
            )}
        </span>
    );
}

export function focusApplyField(id: string): void {
    const field = document.getElementById(id);
    const control = field?.matches('input, textarea, select, button')
        ? field
        : field?.querySelector<HTMLElement>('input, textarea, select, button');

    (control ?? field)?.focus({ preventScroll: true });
    (control ?? field)?.scrollIntoView({
        block: 'center',
        behavior: 'instant',
    });
}
