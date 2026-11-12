import type { PendingVisit } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { applications, resume } from '@/routes';
import { apply } from '@/routes/jobs';

/** The wizard path from `routes/web.php`, split around its `{job}` segment. */
const [applyPrefix, applySuffix] = apply.definition.url.split('{job}');

/**
 * The applicant pages: resume, my jobs and the apply wizard, the three
 * routes in `routes/web.php` behind `auth` + `redirect.staff`.
 */
function isApplicantPage(pathname: string): boolean {
    return (
        pathname === resume().url ||
        pathname === applications().url ||
        (pathname.startsWith(applyPrefix) &&
            pathname.endsWith(applySuffix) &&
            pathname.length > applyPrefix.length + applySuffix.length)
    );
}

/** A visit counts when it is a plain document load of an applicant page. */
function isApplicantPageVisit(visit: PendingVisit): boolean {
    return (
        visit.method === 'get' &&
        visit.only.length === 0 &&
        !visit.prefetch &&
        isApplicantPage(visit.url.pathname)
    );
}

/** A visit to the resume editor itself is a plain document load of it. */
function isResumeVisit(visit: PendingVisit): boolean {
    return (
        visit.method === 'get' &&
        visit.only.length === 0 &&
        !visit.prefetch &&
        visit.url.pathname === resume().url
    );
}

/**
 * True while a visit matching `isTargetVisit` is in flight, so the caller can
 * stand a skeleton in for the page the router has not swapped in yet.
 *
 * The visit's id is tracked rather than a plain flag because Inertia
 * cancels the visit in flight when a new one starts: that visit's `finish`
 * must not clear the state the newer visit still needs. `finish` fires once
 * for every request, cancelled ones included, so it is the only signal the
 * set has to be emptied on.
 */
function usePendingVisit(isTargetVisit: (visit: PendingVisit) => boolean) {
    const [pending, setPending] = useState<ReadonlySet<string>>(
        () => new Set(),
    );

    useEffect(() => {
        const offStart = router.on('start', ({ detail: { visit } }) => {
            if (!isTargetVisit(visit)) {
                return;
            }

            setPending((current) => {
                if (current.has(visit.id)) {
                    return current;
                }

                const next = new Set(current);
                next.add(visit.id);

                return next;
            });
        });

        const offFinish = router.on('finish', ({ detail: { visit } }) => {
            setPending((current) => {
                if (!current.has(visit.id)) {
                    return current;
                }

                const next = new Set(current);
                next.delete(visit.id);

                return next;
            });
        });

        /**
         * The pages this app reaches with plain anchors rather than Inertia's
         * `<Link>` end up as whole document loads, which no router event ever
         * sees. Route those through the router too, so the skeleton the caller
         * stands in for those pages is also shown when they are opened.
         */
        const onClick = (event: MouseEvent) => {
            if (event.defaultPrevented) {
                // Inertia's `<Link>` and the React handlers around the ones the
                // plain anchors carry both get their say in the bubble phase,
                // which runs before this document listener.
                return;
            }

            const anchor =
                event.target instanceof Element
                    ? (event.target.closest(
                          'a[href]',
                      ) as HTMLAnchorElement | null)
                    : null;
            const href = anchor?.getAttribute('href') ?? null;
            if (!anchor || !href) {
                return;
            }

            const url = new URL(href, window.location.href);
            if (url.origin !== window.location.origin || url.hash) {
                return;
            }
            if (!isApplicantPage(url.pathname)) {
                return;
            }

            event.preventDefault();
            router.visit(url.pathname + url.search);
        };

        document.addEventListener('click', onClick);

        return () => {
            offStart();
            offFinish();
            document.removeEventListener('click', onClick);
        };
    }, [isTargetVisit]);

    return pending.size > 0;
}

/**
 * True while a visit to one of the applicant pages is in flight, so the
 * caller can stand a skeleton in for the page the router has not swapped in
 * yet.
 */
export function useApplicantPageLoading(): boolean {
    return usePendingVisit(isApplicantPageVisit);
}

/**
 * True while a visit to the resume editor itself is in flight, so the
 * resume page can stand in a skeleton shaped like the editor.
 */
export function useResumePageLoading(): boolean {
    return usePendingVisit(isResumeVisit);
}
