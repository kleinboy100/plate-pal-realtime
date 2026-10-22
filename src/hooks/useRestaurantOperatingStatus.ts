import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OperatingStatus {
  isOpen: boolean;
  reason?: string;
  openingTime?: string;
  closingTime?: string;
  unavailable?: boolean;
}

export function useRestaurantOperatingStatus(restaurantId: string | null) {
  const [status, setStatus] = useState<OperatingStatus>({ isOpen: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let requestId = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const controllers = new Set<AbortController>();
    setStatus({ isOpen: false });
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const checkStatus = async () => {
      const id = ++requestId;
      clearTimeout(retryTimer);
      const controller = new AbortController();
      controllers.add(controller);
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        // A public read is required: customers cannot read the owner-only table.
        const { data, error } = await supabase
          .from('restaurants_public')
          .select('is_accepting_orders')
          .eq('id', restaurantId)
          .abortSignal(controller.signal)
          .maybeSingle();

        if (disposed || id !== requestId) return;
        if (error || !data || typeof data.is_accepting_orders !== 'boolean') {
          throw new Error('Status unavailable');
        }
        // Only the manual toggle determines open/closed, never operating hours.
        setStatus({ isOpen: data.is_accepting_orders, unavailable: false });
      } catch {
        if (disposed || id !== requestId) return;
        setStatus({
          isOpen: false,
          unavailable: true,
          reason: 'Unable to check store status. Retrying automatically.',
        });
        retryTimer = setTimeout(checkStatus, 3000);
      } finally {
        clearTimeout(timeout);
        controllers.delete(controller);
        if (!disposed && id === requestId) setLoading(false);
      }
    };

    void checkStatus();
    const refresh = () => { void checkStatus(); };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    // Public users may not receive owner-only table events. Never rely on them
    // alone: recover missed updates, interrupted connections and sleeping tabs.
    const pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 15000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', onVisible);
    
    // Subscribe to realtime changes on the restaurants table
    const channel = supabase
      .channel(`restaurant-status-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'restaurants',
          filter: `id=eq.${restaurantId}`
        },
        refresh
      )
      .subscribe();
    
    
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      clearInterval(pollTimer);
      controllers.forEach(controller => controller.abort());
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  return { ...status, loading };
}
