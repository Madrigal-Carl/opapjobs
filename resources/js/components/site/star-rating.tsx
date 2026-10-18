import { Star } from 'lucide-react';

const STARS = [0, 1, 2, 3, 4];

/**
 * Five stars with the nearest whole number filled.
 *
 * The number is carried in the label rather than left to the icons, because
 * a screen reader reads "★★★★★" as nothing at all.
 */
export function StarRating({
    rating,
    size = 15,
    testId,
}: {
    rating: number;
    size?: number;
    testId?: string;
}) {
    const rounded = Math.round(rating);

    return (
        <span
            className="star-rating"
            role="img"
            aria-label={`${rating.toFixed(1)} out of 5 stars`}
            data-testid={testId}
        >
            {STARS.map((index) => (
                <Star
                    key={index}
                    size={size}
                    className={index < rounded ? 'is-on' : ''}
                    fill={index < rounded ? 'currentColor' : 'none'}
                    aria-hidden="true"
                />
            ))}
        </span>
    );
}
