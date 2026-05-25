import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useIsRestaurantDriver } from '@/hooks/useIsRestaurantDriver';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, MapPin, Package, Truck, ClipboardCheck } from 'lucide-react';
import { DriverMap } from '@/components/DriverMap';
import { useNavigate } from 'react-router-dom';

type Order = {
  id: string;
  order_number: number;
  restaurant_id: string;
  total_amount: number;
  tip_amount: number;
  delivery_address: string;
  status: string;
  order_type: string;
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

export default function DriverDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isDriver, driverRestaurantId, loading: driverLoading } = useIsRestaurantDriver();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [destCoords, setDestCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const [declined, setDeclined] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const polledRef = useRef<NodeJS.Timeout | null>(null);

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
      setRestaurant(data as any);
    })();
  }, [driverRestaurantId]);

  // Load + subscribe to relevant orders
  useEffect(() => {
    if (!driverRestaurantId) return;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, restaurant_id, total_amount, tip_amount, delivery_address, status, order_type, driver_id, delivered_at, created_at')
        .eq('restaurant_id', driverRestaurantId)
        .eq('order_type', 'delivery')
        .order('created_at', { ascending: false });
      setOrders((data as any) || []);
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

  // Geocode delivery addresses for active orders
  useEffect(() => {
    const toGeocode = orders.filter(
      (o) => o.driver_id === user?.id && o.status === 'out_for_delivery' && !destCoords[o.id],
    );
    toGeocode.forEach(async (o) => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(o.delivery_address)}&countrycodes=za&limit=1`,
          { headers: { 'User-Agent': 'Nosty/1.0' } },
        );
        const d = await r.json();
        if (d?.[0]) {
          setDestCoords((prev) => ({
            ...prev,
            [o.id]: { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) },
          }));
        }
      } catch (e) {
        console.warn('Geocode driver dest failed', e);
      }
    });
  }, [orders, user?.id, destCoords]);

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

  return (
    <div className="min-h-screen py-4 md:py-8 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-3 md:px-4 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold gradient-text">Driver Dashboard</h1>
            <p className="text-xs text-muted-foreground">{restaurant?.name}</p>
          </div>
        </div>

        <Tabs defaultValue="pickup" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4 p-1.5 bg-muted rounded-xl">
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
            <TabsTrigger value="done" className="text-xs md:text-sm data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg">
              <ClipboardCheck size={14} className="mr-1" />
              Delivered
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
                    {Number(o.tip_amount) > 0 && (
                      <p className="text-xs text-green-600 font-semibold">Tip included: R{Number(o.tip_amount).toFixed(2)}</p>
                    )}
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
                        <p className="font-bold text-primary">R{Number(o.total_amount).toFixed(2)}</p>
                      </div>
                      {dc ? (
                        <DriverMap destination={dc} restaurant={rest} className="h-72" />
                      ) : (
                        <div className="bg-muted rounded-xl h-32 flex items-center justify-center text-sm text-muted-foreground">
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

          <TabsContent value="done">
            {myDelivered.length === 0 ? (
              <EmptyState icon={ClipboardCheck} msg="No completed deliveries yet." />
            ) : (
              <div className="space-y-3">
                {myDelivered.slice(0, 30).map((o) => (
                  <div key={o.id} className="card-elevated p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold">Order #{String(o.order_number).padStart(5, '0')}</p>
                      <p className="font-bold text-primary">R{Number(o.total_amount).toFixed(2)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-start gap-1"><MapPin size={12} className="mt-0.5"/> {o.delivery_address}</p>
                    {Number(o.tip_amount) > 0 && (
                      <p className="text-xs text-green-600 font-semibold">Tip: R{Number(o.tip_amount).toFixed(2)}</p>
                    )}
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

function EmptyState({ icon: Icon, msg }: { icon: any; msg: string }) {
  return (
    <div className="text-center py-12 card-elevated">
      <Icon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">{msg}</p>
    </div>
  );
}
