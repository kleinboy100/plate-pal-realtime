import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useRestaurantRating } from '@/hooks/useRestaurantRating';

interface RatingBadgeProps {
  restaurantId: string;
  variant?: 'header' | 'card';
}

// Live customer rating badge, calculated from real reviews. Links to the
// About page where customers can read how the rating is worked out.
export function RatingBadge({ restaurantId, variant = 'header' }: RatingBadgeProps) {
  const { average, count, loading } = useRestaurantRating(restaurantId);

  if (loading || average === null) return null;

  if (variant === 'card') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-accent/15 text-accent-foreground px-3 py-1.5 rounded-xl">
          <Star size={16} className="text-accent fill-accent" />
          <span className="font-bold text-foreground">{average.toFixed(2)}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          Rated by {count} customer{count === 1 ? '' : 's'}
        </span>
      </div>
    );
  }

  return (
    <Link
      to="/about"
      aria-label={`Rated ${average.toFixed(2)} out of 5 by ${count} customers`}
      className="flex items-center gap-1 bg-white/15 hover:bg-white/25 transition-colors rounded-full px-2.5 py-1 shadow-sm"
      title={`Rated ${average.toFixed(2)} out of 5 by ${count} customers`}
    >
      <Star size={14} className="text-yellow-300 fill-yellow-300" />
      <span className="text-sm font-bold text-white">{average.toFixed(2)}</span>
      <span className="hidden sm:inline text-xs text-white/80">({count})</span>
    </Link>
  );
}
