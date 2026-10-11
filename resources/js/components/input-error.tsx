import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { authErrorClasses } from '@/lib/auth-form-styles';

export default function InputError({
    message,
    className = '',
    ...props
}: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    return message ? (
        <p {...props} className={cn(authErrorClasses, className)}>
            {message}
        </p>
    ) : null;
}
