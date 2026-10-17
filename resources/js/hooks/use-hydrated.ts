import { useEffect, useState } from 'react';

/**
 * Loads something that only exists in the browser, without breaking
 * hydration.
 *
 * The first render — on the server and on the client — uses `seed`, so both
 * produce identical markup. The stored value is applied in a mount effect,
 * which is the first moment the two are allowed to differ. Reading storage
 * during render instead would make the client disagree with the server
 * about the very first frame and force React to throw the tree away.
 */
export function useHydrated<T>(seed: () => T, load: () => T): [T, boolean] {
    const [value, setValue] = useState<T>(seed);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setValue(load());
        setIsHydrated(true);
        // `load` is a closure over whatever the caller wants to read; it is
        // only ever run once, on mount, by design.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return [value, isHydrated];
}
