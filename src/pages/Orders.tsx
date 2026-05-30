import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList } from 'lucide-react';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchOrders();

    // Real-time updates for the user's orders
    const channel = supabase
      .channel(`orders-list-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchOrders();
      })
      .subscribe();

    // Polling fallback in case realtime is unavailable
    const poll = setInterval(fetchOrders, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [user]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, restaurants(name)')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><p>Please sign in to view orders.</p></div>;
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <h1 className="font-display text-2xl font-bold mb-6">My Orders</h1>
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <Link key={order.id} to={`/orders/${order.id}`} className="card-elevated p-4 flex justify-between items-center block">
                <div>
                  <p className="font-semibold">
                    #{order.order_number ? String(order.order_number).padStart(5, '0') : '—'} • {order.restaurants?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">R{Number(order.total_amount).toFixed(2)}</p>
                  <span className={`order-status-badge status-${order.status}`}>{order.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
