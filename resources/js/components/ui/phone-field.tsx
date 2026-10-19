import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DIAL_CODES } from '@/data/countries';

/** Joined dial-code selector and phone input, stored as one international string. */
export function PhoneField({
    value,
    onChange,
    id = 'job-contact-phone',
    ...inputProps
}: {
    value: string;
    onChange: (value: string) => void;
    id?: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
    'data-field'?: string;
}) {
    const country =
        DIAL_CODES.find(
            ({ dial }) => value === dial || value.startsWith(`${dial} `),
        ) ?? DIAL_CODES[0];
    const number = value.startsWith(country.dial)
        ? value.slice(country.dial.length).trimStart()
        : value;

    return (
        <div className="flex min-w-0">
            <Select
                value={country.dial}
                onValueChange={(dial) =>
                    onChange(`${dial} ${number}`.trimEnd())
                }
            >
                <SelectTrigger
                    className="h-9 w-[110px] shrink-0 rounded-r-none border-[var(--line)] bg-white text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                    aria-label="Phone country code"
                    data-testid="select-phone-country"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {DIAL_CODES.map(({ iso, dial }) => (
                        <SelectItem
                            key={iso}
                            value={dial}
                            data-testid={`phone-country-${iso}`}
                        >
                            <span className="text-[10px] text-[var(--slate)] uppercase">
                                {iso}
                            </span>{' '}
                            {dial}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Input
                {...inputProps}
                id={id}
                type="tel"
                autoComplete="tel-national"
                value={number}
                onChange={(event) =>
                    onChange(`${country.dial} ${event.target.value}`.trimEnd())
                }
                className="h-9 min-w-0 flex-1 rounded-l-none border-l-0 px-3 py-0 text-[var(--navy)] focus-visible:ring-2 focus-visible:ring-[var(--teal)]/40"
                placeholder="50 123 4567"
                data-testid="input-job-contact-phone"
            />
        </div>
    );
}
