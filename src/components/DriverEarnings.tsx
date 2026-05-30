import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bike, Wallet, Loader2 } from 'lucide-react';

interface Order {
  id: string;
  order_number: number;
  driver_id: string | null;
  delivery_fee: number;
  tip_amount: number;
  delivered_at: string | null;
  created_at: string;
}

interface Driver {
  user_id: string;
  email: string;
}

export function DriverEarnings({ restaurantId }: { restaurantId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    (async () => {
      const [{ data: orderData }, { data: driverData }] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, driver_id, delivery_fee, tip_amount, delivered_at, created_at')
          .eq('restaurant_id', restaurantId)
          .eq('order_type', 'delivery')
          .eq('status', 'delivered')
          .not('driver_id', 'is', null)
          .order('delivered_at', { ascending: false }),
        supabase
          .from('restaurant_drivers')
          .select('user_id, email')
          .eq('restaurant_id', restaurantId),
      ]);
      setOrders((orderData as Order[] | null) || []);
      setDrivers((driverData as Driver[] | null) || []);
      setLoading(false);
    })();
  }, [restaurantId]);

  const emailFor = (id: string | null) =>
    drivers.find((d) => d.user_id === id)?.email || 'Unknown driver';

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

  // Group by driver, then by date.
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { fees: number; tips: number; count: number; byDate: Map<string, { fees: number; tips: number; count: number }> }
    >();
    filtered.forEach((o) => {
      const key = o.driver_id || 'unknown';
      const dateKey = (o.delivered_at || o.created_at).slice(0, 10);
      if (!map.has(key)) map.set(key, { fees: 0, tips: 0, count: 0, byDate: new Map() });
      const entry = map.get(key)!;
      entry.fees += Number(o.delivery_fee ?? 0);
      entry.tips += Number(o.tip_amount ?? 0);
      entry.count += 1;
      if (!entry.byDate.has(dateKey)) entry.byDate.set(dateKey, { fees: 0, tips: 0, count: 0 });
      const d = entry.byDate.get(dateKey)!;
      d.fees += Number(o.delivery_fee ?? 0);
      d.tips += Number(o.tip_amount ?? 0);
      d.count += 1;
    });
    return Array.from(map.entries()).sort(
      (a, b) => b[1].fees + b[1].tips - (a[1].fees + a[1].tips),
    );
  }, [filtered]);

  const grandTotal = filtered.reduce((s, o) => s + Number(o.delivery_fee ?? 0) + Number(o.tip_amount ?? 0), 0);

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bike size={20} className="text-primary" />
        <h3 className="font-semibold text-base">Driver Earnings</h3>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[130px]">
          <label className="text-[11px] text-muted-foreground">From</label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9" />
        </div>
        <div className="flex-1 min-w-[130px]">
          <label className="text-[11px] text-muted-foreground">To</label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9" />
        </div>
        {(fromDate || toDate) && (
          <Button variant="outline" size="sm" onClick={() => { setFromDate(''); setToDate(''); }}>Clear</Button>
        )}
      </div>

      <div className="card-elevated p-3 flex items-center justify-between bg-gradient-to-br from-card to-primary/5">
        <span className="flex items-center gap-2 text-sm font-medium"><Wallet size={16} className="text-primary" /> Total paid to drivers</span>
        <span className="font-bold text-primary">R{grandTotal.toFixed(2)}</span>
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No driver deliveries for this period.</p>
      ) : (
        <div className="space-y-3">
          {grouped.map(([driverId, entry]) => (
            <div key={driverId} className="card-elevated p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{emailFor(driverId)}</p>
                  <p className="text-xs text-muted-foreground">{entry.count} deliveries</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-primary">R{(entry.fees + entry.tips).toFixed(2)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    R{entry.fees.toFixed(2)} fees · R{entry.tips.toFixed(2)} tips
                  </p>
                </div>
              </div>
              <div className="border-t border-border/50 pt-2 space-y-1">
                {Array.from(entry.byDate.entries())
                  .sort((a, b) => (a[0] < b[0] ? 1 : -1))
                  .map(([date, d]) => (
                    <div key={date} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{new Date(date + 'T00:00:00').toLocaleDateString()}</span>
                      <span className="font-medium">
                        {d.count} · R{(d.fees + d.tips).toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
