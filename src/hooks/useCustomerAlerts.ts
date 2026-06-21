import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ACTIVE_EXCLUDED = ['delivered', 'cancelled'];

export function useCustomerAlerts() {
  const { user } = useAuth();
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [hasUnreadMessage, setHasUnreadMessage] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setHasActiveOrder(false);
      setHasUnreadMessage(false);
      setActiveOrderId(null);
      return;
    }

    // Active (in-progress) orders for this user
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status')
      .eq('user_id', user.id)
      .not('status', 'in', `(${ACTIVE_EXCLUDED.join(',')})`)
      .order('created_at', { ascending: false });

    const active = (orders || []).filter((o) => !ACTIVE_EXCLUDED.includes(o.status));
    setHasActiveOrder(active.length > 0);
    setActiveOrderId(active[0]?.id ?? null);

    // Unread messages from the restaurant on the user's orders
    const orderIds = (orders || []).map((o) => o.id);
    if (orderIds.length > 0) {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('order_id', orderIds)
        .eq('sender_type', 'restaurant')
        .eq('is_read', false);
      setHasUnreadMessage((count ?? 0) > 0);
    } else {
      setHasUnreadMessage(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;

    const channel = supabase
      .channel(`customer-alerts-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => refresh())
      .subscribe();

    const poll = setInterval(refresh, 20000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [user, refresh]);

  return { hasActiveOrder, hasUnreadMessage, activeOrderId, refresh };
}
