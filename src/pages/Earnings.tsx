import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsRestaurantOwner } from '@/hooks/useIsRestaurantOwner';
import { useIsRestaurantStaff } from '@/hooks/useIsRestaurantStaff';
import { useIsRestaurantDriver } from '@/hooks/useIsRestaurantDriver';
import { supabase } from '@/integrations/supabase/client';
import { DriverEarnings } from '@/components/DriverEarnings';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, MapPin } from 'lucide-react';

interface Order {
  id: string;
  order_number: number;
  delivery_fee: number;
  tip_amount: number;
  delivery_address: string;
  delivered_at: string | null;
  created_at: string;
}

function MyDriverEarnings() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, delivery_fee, tip_amount, delivery_address, delivered_at, created_at')
        .eq('driver_id', user.id)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false });
      setOrders((data as Order[] | null) || []);
      setLoading(false);
    })();
  }, [user]);

  const fromTs = fromDate ? new Date(fromDate + 'T00:00:00').getTime() : null;
  const toTs = toDate ? new Date(toDate + 'T23:59:59').getTime() : null;

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        const t = o.delivered_at ? new Date(o.delivered_at).getTime() : new Date(o.created_at).getTime();
        if (fromTs && t < fromTs) return false;
        if (toTs && t > toTs) return false;
        return true;
      }),
    [orders, fromTs, toTs],
  );

  const earnings = filtered.reduce(
    (acc, o) => {
      acc.fees += Number(o.delivery_fee ?? 0);
      acc.tips += Number(o.tip_amount ?? 0);
      return acc;
    },
    { fees: 0, tips: 0 },
  );
  const total = earnings.fees + earnings.tips;

  if (loading) return <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="card-elevated p-4 bg-gradient-to-br from-card to-green-500/5">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={18} className="text-green-600" />
          <h3 className="font-semibold">My earnings</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg bg-muted/60 p-2 text-center">
            <p className="text-[11px] text-muted-foreground">Delivery</p>
            <p className="font-bold text-indigo-600">R{earnings.fees.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-2 text-center">
            <p className="text-[11px] text-muted-foreground">Tips</p>
            <p className="font-bold text-green-600">R{earnings.tips.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2 text-center">
            <p className="text-[11px] text-muted-foreground">Total</p>
            <p className="font-bold text-primary">R{total.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[120px]">
            <label className="text-[11px] text-muted-foreground">From</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9" />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-[11px] text-muted-foreground">To</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9" />
          </div>
          {(fromDate || toDate) && (
            <Button variant="outline" size="sm" onClick={() => { setFromDate(''); setToDate(''); }}>Clear</Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{filtered.length} deliveries</p>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No completed deliveries for this period.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <div key={o.id} className="card-elevated p-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-bold">Order #{String(o.order_number).padStart(5, '0')}</p>
                <p className="font-bold text-indigo-600">Delivery R{Number(o.delivery_fee).toFixed(2)}</p>
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1"><MapPin size={12} className="mt-0.5" /> {o.delivery_address}</p>
              <p className="text-xs font-semibold text-right">You earned R{(Number(o.delivery_fee) + Number(o.tip_amount)).toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Earnings() {
  const { user } = useAuth();
  const { isOwner } = useIsRestaurantOwner();
  const { isStaff, staffRestaurantId } = useIsRestaurantStaff();
  const { isDriver } = useIsRestaurantDriver();
  const [ownerRestaurantId, setOwnerRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isOwner) return;
    (async () => {
      const { data } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).limit(1);
      setOwnerRestaurantId(data?.[0]?.id ?? null);
    })();
  }, [user, isOwner]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please sign in.</p>
      </div>
    );
  }

  const restaurantId = isOwner ? ownerRestaurantId : isStaff ? staffRestaurantId : null;

  return (
    <div className="min-h-screen py-6 md:py-10 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 max-w-xl">
        <h1 className="font-display text-xl md:text-2xl font-bold gradient-text mb-6">Earnings</h1>
        {restaurantId ? (
          <DriverEarnings restaurantId={restaurantId} />
        ) : isDriver ? (
          <MyDriverEarnings />
        ) : (
          <p className="text-sm text-muted-foreground">No earnings data available for your account.</p>
        )}
      </div>
    </div>
  );
}
