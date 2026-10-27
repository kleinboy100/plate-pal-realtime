import { useState, useEffect } from 'react';
import { publicRestaurantClient } from '@/lib/publicRestaurantClient';

export interface RestaurantRating {
  average: number | null;
  count: number;
}

export function computeRating(ratings: number[]): RestaurantRating {
  const valid = ratings.filter((r) => typeof r === 'number' && r >= 1 && r <= 5);
  if (valid.length === 0) return { average: null, count: 0 };
  const sum = valid.reduce((acc, r) => acc + r, 0);
  return { average: Math.round((sum / valid.length) * 100) / 100, count: valid.length };
}

// Live customer rating calculated from the public reviews view. Uses the
// session-free client so an expired or stalled customer session can never
// block the rating from loading, and recovers through retries, polling and
// focus/online refreshes just like the operating-status hook.
export function useRestaurantRating(restaurantId: string | null) {
  const [rating, setRating] = useState<RestaurantRating>({ average: null, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let requestId = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const controllers = new Set<AbortController>();
    setRating({ average: null, count: 0 });
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const fetchRating = async () => {
      const id = ++requestId;
      clearTimeout(retryTimer);
      const controller = new AbortController();
      controllers.add(controller);
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const { data, error } = await publicRestaurantClient
          .from('reviews_public')
          .select('rating')
          .eq('restaurant_id', restaurantId)
          .abortSignal(controller.signal);

        if (disposed || id !== requestId) return;
        if (error) throw new Error('Rating unavailable');
        setRating(computeRating((data || []).map((r) => Number(r.rating))));
      } catch {
        if (disposed || id !== requestId) return;
        retryTimer = setTimeout(fetchRating, 5000);
      } finally {
        clearTimeout(timeout);
        controllers.delete(controller);
        if (!disposed && id === requestId) setLoading(false);
      }
    };

    void fetchRating();
    const refresh = () => { void fetchRating(); };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 60000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      clearInterval(pollTimer);
      controllers.forEach((controller) => controller.abort());
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [restaurantId]);

  return { ...rating, loading };
}
