import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useIsRestaurantDriver } from '@/hooks/useIsRestaurantDriver';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, MapPin, Package, Truck, ClipboardCheck, Navigation, Wallet, type LucideIcon } from 'lucide-react';
import { DriverMap } from '@/components/DriverMap';
import { DriverNavMap } from '@/components/DriverNavMap';
import { OrderChat } from '@/components/OrderChat';

import { playNotification } from '@/lib/notificationSound';
import { useNavigate } from 'react-router-dom';

type Order = {
  id: string;
  order_number: number;
  restaurant_id: string;
  total_amount: number;
  tip_amount: number;
  delivery_fee: number;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  delivery_location_accuracy_m: number | null;
  delivery_address_source: string | null;
  status: string;
  order_type: string;
  payment_method: string | null;
  payment_confirmed: boolean | null;
  driver_id: string | null;
  delivered_at: string | null;
  created_at: string;
};

type Restaurant = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

function OrderMoneyBreakdown({ order }: { order: Order }) {
  const deliveryFee = Number(order.delivery_fee ?? 0);
  const tip = Number(order.tip_amount ?? 0);
  const mealsTotal = Number(order.total_amount) - deliveryFee - tip;
  const paymentLabel = order.payment_confirmed
    ? order.payment_method === 'cash'
      ? 'Cash on Delivery'
      : 'Paid Online'
    : 'Payment pending';
  const isCash = order.payment_confirmed && order.payment_method === 'cash';
  return (
    <div className="rounded-lg bg-muted/60 p-3 space-y-1 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Meals total</span>
        <span>R{mealsTotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Delivery price</span>
        <span>R{deliveryFee.toFixed(2)}</span>
      </div>
      {tip > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tip</span>
          <span className="text-green-600">R{tip.toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between font-semibold pt-1 border-t">
        <span>Total due</span>
        <span>R{Number(order.total_amount).toFixed(2)}</span>
      </div>
      <div className={`flex items-center gap-1.5 pt-1 font-medium ${isCash ? 'text-amber-600' : 'text-emerald-600'}`}>
        <Wallet size={14} />
        <span>{paymentLabel}{isCash ? ` — collect R${Number(order.total_amount).toFixed(2)}` : ''}</span>
      </div>
    </div>
  );
}


export default function DriverDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isDriver, driverRestaurantId, loading: driverLoading } = useIsRestaurantDriver();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [destCoords, setDestCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const [destErrors, setDestErrors] = useState<Set<string>>(new Set());
  const [declined, setDeclined] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [navOrderId, setNavOrderId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const polledRef = useRef<NodeJS.Timeout | null>(null);
  const knownReadyRef = useRef<Set<string> | null>(null);
  const soundKey = `driver-${user?.id ?? 'anon'}`;

  // Play a notification sound when a new delivery becomes available for pickup.
  useEffect(() => {
    const readyIds = orders
      .filter((o) => o.status === 'ready' && o.driver_id === null)
      .map((o) => o.id);
    if (knownReadyRef.current === null) {
      // First load: remember current orders without alerting.
      knownReadyRef.current = new Set(readyIds);
      return;
    }
    const hasNew = readyIds.some((id) => !knownReadyRef.current!.has(id));
    if (hasNew) playNotification(soundKey, 'New delivery available');
    knownReadyRef.current = new Set(readyIds);
  }, [orders, soundKey]);

  // Redirect non-drivers
  useEffect(() => {
    if (!authLoading && !driverLoading) {
      if (!user) navigate('/auth', { replace: true });
      else if (!isDriver) navigate('/', { replace: true });
    }
  }, [user, isDriver, authLoading, driverLoading, navigate]);

  // Load restaurant info
  useEffect(() => {
    if (!driverRestaurantId) return;
    (async () => {
      const { data } = await supabase
        .from('restaurants')
        .select('id, name, address, latitude, longitude')
        .eq('id', driverRestaurantId)
        .maybeSingle();
      setRestaurant(data as Restaurant | null);
    })();
  }, [driverRestaurantId]);

  // Load + subscribe to relevant orders
  useEffect(() => {
    if (!driverRestaurantId) return;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, restaurant_id, total_amount, tip_amount, delivery_fee, delivery_address, delivery_latitude, delivery_longitude, delivery_location_accuracy_m, delivery_address_source, status, order_type, payment_method, payment_confirmed, driver_id, delivered_at, created_at')
        .eq('restaurant_id', driverRestaurantId)
        .eq('order_type', 'delivery')
        .order('created_at', { ascending: false });
      setOrders((data as Order[] | null) || []);
    };
    fetchOrders();
    const ch = supabase
      .channel(`driver-orders-${driverRestaurantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${driverRestaurantId}`,
      }, fetchOrders)
      .subscribe();

    polledRef.current = setInterval(fetchOrders, 8000);
    return () => {
      supabase.removeChannel(ch);
      if (polledRef.current) clearInterval(polledRef.current);
    };
  }, [driverRestaurantId]);

  // Use saved precise coordinates first; geocode older orders as a fallback.
  useEffect(() => {
    const toGeocode = orders.filter(
      (o) => o.driver_id === user?.id && o.status === 'out_for_delivery' && !destCoords[o.id] && !destErrors.has(o.id),
    );
    toGeocode.forEach(async (o) => {
      if (o.delivery_latitude != null && o.delivery_longitude != null) {
        setDestCoords((prev) => ({ ...prev, [o.id]: { lat: Number(o.delivery_latitude), lng: Number(o.delivery_longitude) } }));
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('calculate-distance', {
          body: {
            customerAddress: o.delivery_address,
            restaurantCoords: restaurant?.latitude && restaurant?.longitude
              ? { lat: Number(restaurant.latitude), lng: Number(restaurant.longitude) }
              : undefined,
            restaurantAddress: restaurant?.address,
          },
        });
        if (!error && data?.customerCoords) {
          setDestCoords((prev) => ({ ...prev, [o.id]: data.customerCoords }));
        } else {
          setDestErrors((prev) => new Set([...prev, o.id]));
        }
      } catch (e) {
        console.warn('Geocode driver dest failed', e);
        setDestErrors((prev) => new Set([...prev, o.id]));
      }
    });
  }, [orders, user?.id, destCoords, destErrors, restaurant]);

  const accept = async (id: string) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.rpc('claim_delivery_order', { p_order_id: id });
      if (error || !data) {
        toast({ title: 'Could not accept', description: 'Another driver may have taken this order.', variant: 'destructive' });
      } else {
        toast({ title: 'Order accepted', description: 'Navigate to the customer.' });
      }
    } finally {
      setBusyId(null);
    }
  };

  const decline = (id: string) => {
    setDeclined((p) => new Set([...p, id]));
    toast({ title: 'Declined', description: 'The order stays available for other drivers.' });
  };

  const markDelivered = async (id: string) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.rpc('mark_order_delivered', { p_order_id: id });
      if (error || !data) {
        toast({ title: 'Could not update', description: 'Please try again.', variant: 'destructive' });
      } else {
        toast({ title: 'Marked delivered', description: 'Great work!' });
        setNavOrderId((cur) => (cur === id ? null : cur));
      }
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || driverLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!user || !isDriver) return null;

  const pickupReady = orders.filter((o) => o.status === 'ready' && o.driver_id === null && !declined.has(o.id));
  const myActive = orders.filter((o) => o.driver_id === user.id && o.status === 'out_for_delivery');
  const myDelivered = orders.filter((o) => o.driver_id === user.id && o.status === 'delivered');

  // Date-filtered history for the Done tab
  const fromTs = fromDate ? new Date(fromDate + 'T00:00:00').getTime() : null;
  const toTs = toDate ? new Date(toDate + 'T23:59:59').getTime() : null;
  const filteredDelivered = myDelivered.filter((o) => {
    const t = o.delivered_at ? new Date(o.delivered_at).getTime() : new Date(o.created_at).getTime();
    if (fromTs && t < fromTs) return false;
    if (toTs && t > toTs) return false;
    return true;
  });

  const earnings = filteredDelivered.reduce(
    (acc, o) => {
      acc.fees += Number(o.delivery_fee ?? 0);
      acc.tips += Number(o.tip_amount ?? 0);
      return acc;
    },
    { fees: 0, tips: 0 },
  );
  const totalEarnings = earnings.fees + earnings.tips;

  // The order currently being navigated (full screen)
  const navOrder = navOrderId ? myActive.find((o) => o.id === navOrderId) : null;
  const navDest = navOrder ? destCoords[navOrder.id] : null;

  return (
    <div className="min-h-screen py-4 md:py-8 bg-gradient-to-br from-background via-background to-primary/5">
      {navOrder && navDest && (
        <DriverNavMap
          destination={{ ...navDest, address: navOrder.delivery_address }}
          origin={restaurant?.latitude && restaurant?.longitude
            ? { lat: Number(restaurant.latitude), lng: Number(restaurant.longitude) }
            : undefined}
          orderLabel={`Order #${String(navOrder.order_number).padStart(5, '0')}`}
          onClose={() => setNavOrderId(null)}
        />
      )}

      <div className="container mx-auto px-3 md:px-4 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold gradient-text">Driver Dashboard</h1>
            <p className="text-xs text-muted-foreground">{restaurant?.name}</p>
          </div>
        </div>






        <Tabs defaultValue="pickup" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4 p-1.5 bg-muted rounded-xl">
            <TabsTrigger value="pickup" className="text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              <Package size={14} className="mr-1" />
              Ready
              {pickupReady.length > 0 && (
                <span className="ml-1 bg-primary-foreground text-primary text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {pickupReady.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs md:text-sm data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg">
              <Truck size={14} className="mr-1" />
              Active
              {myActive.length > 0 && (
                <span className="ml-1 bg-white text-blue-600 text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {myActive.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="map" className="text-xs md:text-sm data-[state=active]:bg-indigo-500 data-[state=active]:text-white rounded-lg">
              <Navigation size={14} className="mr-1" />
              Map
            </TabsTrigger>
            <TabsTrigger value="done" className="text-xs md:text-sm data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg">
              <ClipboardCheck size={14} className="mr-1" />
              Done
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pickup">
            {pickupReady.length === 0 ? (
              <EmptyState icon={Package} msg="No deliveries ready for pickup right now." />
            ) : (
              <div className="space-y-3">
                {pickupReady.map((o) => (
                  <div key={o.id} className="card-elevated p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">Order #{String(o.order_number).padStart(5, '0')}</p>
                        <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleTimeString()}</p>
                      </div>
                      <p className="font-bold text-primary">R{Number(o.total_amount).toFixed(2)}</p>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin size={14} className="mt-0.5 shrink-0" />
                      <span>{o.delivery_address}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-semibold text-indigo-600">Delivery: R{Number(o.delivery_fee).toFixed(2)}</span>
                      {Number(o.tip_amount) > 0 && (
                        <span className="text-green-600 font-semibold">Tip: R{Number(o.tip_amount).toFixed(2)}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => accept(o.id)} disabled={busyId === o.id} className="flex-1 btn-primary">
                        {busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><CheckCircle size={16} className="mr-1" />Accept</>)}
                      </Button>
                      <Button onClick={() => decline(o.id)} variant="outline" className="flex-1">
                        <XCircle size={16} className="mr-1" />Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active">
            {myActive.length === 0 ? (
              <EmptyState icon={Truck} msg="No active deliveries. Accept one from the Ready tab." />
            ) : (
              <div className="space-y-4">
                {myActive.map((o) => {
                  const dc = destCoords[o.id];
                  const rest = restaurant?.latitude && restaurant?.longitude
                    ? { lat: Number(restaurant.latitude), lng: Number(restaurant.longitude) }
                    : undefined;
                  return (
                    <div key={o.id} className="card-elevated p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">Order #{String(o.order_number).padStart(5, '0')}</p>
                          <p className="text-xs text-muted-foreground flex items-start gap-1"><MapPin size={12} className="mt-0.5"/> {o.delivery_address}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">R{Number(o.total_amount).toFixed(2)}</p>
                          <p className="text-xs text-indigo-600 font-semibold">Delivery R{Number(o.delivery_fee).toFixed(2)}</p>
                          {Number(o.tip_amount) > 0 && (
                            <p className="text-xs text-green-600 font-semibold">Tip R{Number(o.tip_amount).toFixed(2)}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => { setNavOrderId(o.id); }}
                          disabled={!dc}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <Navigation size={16} className="mr-1" />
                          {dc ? 'Navigate' : 'Locating…'}
                        </Button>
                        <OrderChat orderId={o.id} userType="restaurant" />
                      </div>

                      {dc ? (
                        <DriverMap destination={dc} restaurant={rest} className="h-[320px] md:h-[420px]" />
                      ) : destErrors.has(o.id) ? (
                        <div className="bg-muted rounded-xl h-[320px] md:h-[420px] flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                          <MapPin className="h-8 w-8" />
                          <span>Customer location could not be found. Use the written address above.</span>
                        </div>
                      ) : (
                        <div className="bg-muted rounded-xl h-[320px] md:h-[420px] flex items-center justify-center text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Locating customer...
                        </div>
                      )}
                      <Button
                        onClick={() => markDelivered(o.id)}
                        disabled={busyId === o.id}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        {busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><CheckCircle size={16} className="mr-1" />Mark as Delivered</>)}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="map">
            {myActive.length === 0 ? (
              <EmptyState icon={Navigation} msg="No active delivery to navigate. Accept an order first." />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Tap an order to open full-screen voice navigation.</p>
                {myActive.map((o) => {
                  const dc = destCoords[o.id];
                  return (
                    <button
                      key={o.id}
                      onClick={() => dc && setNavOrderId(o.id)}
                      disabled={!dc}
                      className="w-full text-left card-elevated p-4 flex items-center justify-between gap-3 disabled:opacity-60"
                    >
                      <div className="min-w-0">
                        <p className="font-bold">Order #{String(o.order_number).padStart(5, '0')}</p>
                        <p className="text-xs text-muted-foreground flex items-start gap-1 truncate"><MapPin size={12} className="mt-0.5 shrink-0"/> {o.delivery_address}</p>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 text-indigo-600 font-semibold text-sm">
                        <Navigation size={16} /> {dc ? 'Navigate' : 'Locating…'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="done">
            {/* Earnings summary */}
            <div className="card-elevated p-4 mb-4 bg-gradient-to-br from-card to-green-500/5">
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
                  <p className="font-bold text-primary">R{totalEarnings.toFixed(2)}</p>
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
              <p className="text-xs text-muted-foreground mt-2">{filteredDelivered.length} deliveries</p>
            </div>

            {filteredDelivered.length === 0 ? (
              <EmptyState icon={ClipboardCheck} msg="No completed deliveries for this period." />
            ) : (
              <div className="space-y-3">
                {filteredDelivered.map((o) => (
                  <div key={o.id} className="card-elevated p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold">Order #{String(o.order_number).padStart(5, '0')}</p>
                      <p className="font-bold text-indigo-600">Delivery R{Number(o.delivery_fee).toFixed(2)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-start gap-1"><MapPin size={12} className="mt-0.5"/> {o.delivery_address}</p>
                    <div className="flex items-center justify-between">
                      {Number(o.tip_amount) > 0 ? (
                        <p className="text-xs text-green-600 font-semibold">Tip: R{Number(o.tip_amount).toFixed(2)}</p>
                      ) : <span />}
                      <p className="text-xs font-semibold">You earned R{(Number(o.delivery_fee) + Number(o.tip_amount)).toFixed(2)}</p>
                    </div>
                    {o.delivered_at && (
                      <p className="text-xs text-muted-foreground">Delivered {new Date(o.delivered_at).toLocaleString()}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, msg }: { icon: LucideIcon; msg: string }) {
  return (
    <div className="text-center py-12 card-elevated">
      <Icon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">{msg}</p>
    </div>
  );
}
