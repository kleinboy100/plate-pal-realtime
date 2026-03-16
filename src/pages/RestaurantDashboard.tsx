import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RestaurantOrderCard } from '@/components/RestaurantOrderCard';
import { YocoSettings } from '@/components/YocoSettings';
import { MenuManager } from '@/components/MenuManager';
import { OperatingHoursSettings } from '@/components/OperatingHoursSettings';
import { StaffManager } from '@/components/StaffManager';
import { Store, Bell, Volume2, Settings, UtensilsCrossed, BarChart3, ExternalLink } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useIsRestaurantOwner } from '@/hooks/useIsRestaurantOwner';
import { useIsRestaurantStaff } from '@/hooks/useIsRestaurantStaff';

const EXTERNAL_DASHBOARD_URL = 'https://restaurant-demand-forecasting-1.onrender.com';

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const { isOwner } = useIsRestaurantOwner();
  const { isStaff, staffRestaurantId } = useIsRestaurantStaff();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const { permission, requestPermission, showNotification, supported } = usePushNotifications();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Determine if user is staff-only (not owner)
  const isStaffOnly = isStaff && !isOwner;

  useEffect(() => {
    if (user) fetchRestaurants();
  }, [user, isStaff, staffRestaurantId]);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchOrders();
      
      const channel = supabase
        .channel('restaurant-orders')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${selectedRestaurant}`
        }, (payload) => {
          const newOrder = payload.new as any;
          setNewOrderIds(prev => new Set([...prev, newOrder.id]));
          playNotificationSound();
          showNotification('🔔 New Order!', {
            body: `New order #${newOrder.id.slice(0, 8)} received. Total: R${Number(newOrder.total_amount).toFixed(2)}`,
            tag: `new-order-${newOrder.id}`,
            requireInteraction: true
          });
          fetchOrders();
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${selectedRestaurant}`
        }, (payload) => {
          const updatedOrder = payload.new as any;
          setOrders(prev => prev.map(o => 
            o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o
          ));
        })
        .subscribe();

      const pollInterval = setInterval(() => {
        fetchOrders();
      }, 5000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(pollInterval);
      };
    }
  }, [selectedRestaurant, showNotification]);

  const playNotificationSound = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleToZ');
    }
    audioRef.current.play().catch(() => {});
  };

  const fetchRestaurants = async () => {
    if (isStaffOnly && staffRestaurantId) {
      // Staff: fetch only their assigned restaurant
      const { data } = await supabase.from('restaurants').select('*').eq('id', staffRestaurantId);
      setRestaurants(data || []);
      if (data?.[0]) setSelectedRestaurant(data[0].id);
    } else {
      // Owner: fetch owned restaurants
      const { data } = await supabase.from('restaurants').select('*').eq('owner_id', user?.id);
      setRestaurants(data || []);
      if (data?.[0]) setSelectedRestaurant(data[0].id);
    }
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('restaurant_id', selectedRestaurant)
      .order('created_at', { ascending: false });
    setOrders(data || []);
  };

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    setNewOrderIds(prev => {
      const updated = new Set(prev);
      updated.delete(orderId);
      return updated;
    });
    fetchOrders();
  };

  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Please sign in.</p>
    </div>
  );

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeOrders = orders.filter(o => ['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status));
  const completedOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  return (
    <div className="min-h-screen py-4 md:py-8 overflow-x-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-3 md:px-4 max-w-full">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4 md:mb-6">
          <h1 className="font-display text-xl md:text-2xl font-bold gradient-text">
            {isStaffOnly ? 'Staff Dashboard' : 'Dashboard'}
          </h1>
          <div className="flex gap-2 flex-wrap">
            <a href={EXTERNAL_DASHBOARD_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="text-sm" size="sm">
                <ExternalLink size={16} className="mr-1" />
                Forecasting
              </Button>
            </a>
            <Link to="/restaurant/analytics">
              <Button variant="outline" className="text-sm" size="sm">
                <BarChart3 size={16} className="mr-1" />
                Analytics
              </Button>
            </Link>
          </div>
        </div>

        {restaurants.length === 0 ? (
          <div className="text-center py-12 card-elevated bg-gradient-to-br from-card to-primary/5 border-primary/20">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Store size={32} className="text-primary" />
            </div>
            <p className="text-muted-foreground mb-4">
              {isStaffOnly ? 'You have not been assigned to a restaurant yet.' : 'No restaurants yet'}
            </p>
            {!isStaffOnly && (
              <Link to="/restaurant/register">
                <Button className="btn-primary">Register Your First Restaurant</Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Restaurant Selector & Notifications */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center mb-4 md:mb-6">
              <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                <SelectTrigger className="w-full sm:w-48 md:w-56 bg-gradient-to-r from-card to-muted/50 border-primary/20 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {supported && permission !== 'granted' && (
                <Button variant="outline" size="sm" onClick={handleEnableNotifications} className="text-sm">
                  <Bell size={14} className="mr-1" />
                  Notifications
                </Button>
              )}

              {permission === 'granted' && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <Volume2 size={14} />
                  On
                </span>
              )}
            </div>

            {/* Order Tabs */}
            <Tabs defaultValue="pending" className="w-full overflow-hidden">
              <TabsList className="mb-4 w-full flex flex-wrap h-auto gap-1 p-1.5 bg-gradient-to-r from-muted/80 to-muted rounded-xl border border-border/50">
                <TabsTrigger value="pending" className="relative flex-1 min-w-0 text-xs md:text-sm px-2 md:px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg transition-all">
                  <span className="hidden sm:inline">New </span>Orders
                  {pendingOrders.length > 0 && (
                    <span className="ml-1 bg-primary-foreground text-primary data-[state=active]:bg-primary-foreground data-[state=active]:text-primary text-xs w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center font-bold">
                      {pendingOrders.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="active" className="flex-1 min-w-0 text-xs md:text-sm px-2 md:px-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all">
                  Active
                  {activeOrders.length > 0 && (
                    <span className="ml-1 bg-blue-100 text-blue-600 text-xs w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center font-bold">
                      {activeOrders.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex-1 min-w-0 text-xs md:text-sm px-2 md:px-3 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all">
                  <span className="hidden sm:inline">Completed</span>
                  <span className="sm:hidden">Done</span>
                </TabsTrigger>
                {/* Only show Menu and Settings for owners */}
                {!isStaffOnly && (
                  <>
                    <TabsTrigger value="menu" className="flex-1 min-w-0 text-xs md:text-sm px-2 md:px-3 data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all">
                      <UtensilsCrossed size={14} className="mr-1 shrink-0" />
                      <span className="hidden sm:inline">Menu</span>
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex-1 min-w-0 text-xs md:text-sm px-2 md:px-3 data-[state=active]:bg-slate-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all">
                      <Settings size={14} className="mr-1 shrink-0" />
                      <span className="hidden sm:inline">Settings</span>
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              <TabsContent value="pending">
                {pendingOrders.length === 0 ? (
                  <div className="text-center py-12 card-elevated">
                    <p className="text-muted-foreground">No pending orders</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingOrders.map(order => (
                      <RestaurantOrderCard
                        key={order.id}
                        order={order}
                        onUpdateStatus={updateStatus}
                        isNew={newOrderIds.has(order.id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="active">
                {activeOrders.length === 0 ? (
                  <div className="text-center py-12 card-elevated">
                    <p className="text-muted-foreground">No active orders</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeOrders.map(order => (
                      <RestaurantOrderCard
                        key={order.id}
                        order={order}
                        onUpdateStatus={updateStatus}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed">
                {completedOrders.length === 0 ? (
                  <div className="text-center py-12 card-elevated">
                    <p className="text-muted-foreground">No completed orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedOrders.slice(0, 20).map(order => (
                      <RestaurantOrderCard
                        key={order.id}
                        order={order}
                        onUpdateStatus={updateStatus}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {!isStaffOnly && (
                <>
                  <TabsContent value="menu">
                    <MenuManager restaurantId={selectedRestaurant} />
                  </TabsContent>
                  <TabsContent value="settings">
                    <div className="max-w-xl space-y-8">
                      <div>
                        <h2 className="font-semibold text-lg mb-4">Operating Hours</h2>
                        <OperatingHoursSettings restaurantId={selectedRestaurant} />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg mb-4">Payment Settings</h2>
                        <YocoSettings restaurantId={selectedRestaurant} />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg mb-4">Staff Management</h2>
                        <StaffManager restaurantId={selectedRestaurant} />
                      </div>
                    </div>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
