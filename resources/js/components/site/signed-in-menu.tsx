import { router, usePage } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    CircleHelp,
    FileText,
    LogOut,
    Settings,
    Sparkles,
    Star,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getNameInitials } from '@/lib/name-initials';

const accountLinks: { label: string; icon: typeof FileText; href?: string }[] =
    [
        { label: 'Resume', icon: FileText },
        { label: 'Applications', icon: BriefcaseBusiness },
        { label: 'Matches', icon: Sparkles },
        { label: 'Reviews', icon: Star },
    ];

const accountSupportLinks = [
    { label: 'Settings', icon: Settings, href: '/settings/profile' },
    { label: 'Help', icon: CircleHelp },
];

export function SignedInMenu({
    compact = false,
    open,
    onToggle,
}: {
    compact?: boolean;
    open: boolean;
    onToggle: () => void;
}) {
    const { user } = usePage().props.auth;

    if (!user) {
        return null;
    }

    return (
        <div
            className={`nav-dropdown-wrap ${
                compact ? 'nav-user-menu-compact' : ''
            }`}
        >
            <button
                className={`nav-user-trigger ${compact ? 'nav-user-trigger-compact' : ''}`}
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label={`Open account menu for ${user.name}`}
                data-testid={
                    compact
                        ? 'button-mobile-account-menu'
                        : 'button-account-menu'
                }
            >
                <Avatar className="nav-user-avatar">
                    <AvatarFallback
                        className="bg-[var(--teal)] font-semibold text-white"
                        aria-hidden="true"
                    >
                        {getNameInitials(user.name)}
                    </AvatarFallback>
                </Avatar>
            </button>
            {open && (
                <div
                    className="nav-dropdown nav-dropdown-account"
                    role="menu"
                    data-testid="menu-account"
                >
                    <div className="account-menu-user">
                        <span>{user.name}</span>
                        <small>{user.email}</small>
                    </div>
                    {accountLinks.map(({ label, icon: Icon, href }) => (
                        <a
                            className="account-menu-item"
                            href={href ?? '#'}
                            key={label}
                            role="menuitem"
                            onClick={onToggle}
                            data-testid={`link-account-${label.toLowerCase()}`}
                        >
                            <Icon aria-hidden="true" />
                            {label}
                        </a>
                    ))}
                    <div className="account-menu-divider" role="separator" />
                    {accountSupportLinks.map(({ label, icon: Icon, href }) => (
                        <a
                            className="account-menu-item"
                            href={href ?? '#'}
                            key={label}
                            role="menuitem"
                            onClick={onToggle}
                            data-testid={`link-account-${label.toLowerCase()}`}
                        >
                            <Icon aria-hidden="true" />
                            {label}
                        </a>
                    ))}
                    <div className="account-menu-divider" role="separator" />
                    <button
                        className="account-menu-item"
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            onToggle();
                            router.post('/logout');
                        }}
                        data-testid="button-account-sign-out"
                    >
                        <LogOut aria-hidden="true" />
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}
