import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, Bell, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useRestaurantOperatingStatus } from '@/hooks/useRestaurantOperatingStatus';
import { AddressAutocomplete, type AddressLocation } from '@/components/AddressAutocomplete';
import { OrderTypeSelector } from '@/components/OrderTypeSelector';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const MAX_NOTES_LENGTH = 1000;
const MAX_ADDRESS_LENGTH = 500;
const RATE_PER_METER = 1.35 / 80; // R1.35 per 80m

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, total, restaurantId } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { permission, requestPermission, supported } = usePushNotifications();
  const { isOpen, reason, openingTime, closingTime, loading: statusLoading } = useRestaurantOperatingStatus(restaurantId);
  
  const [orderType, setOrderType] = useState<'delivery' | 'collection'>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<AddressLocation | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurantCoords, setRestaurantCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [restaurantAddress, setRestaurantAddress] = useState<string>('');
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [serverFee, setServerFee] = useState<number | null>(null);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>('');

  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
      const { data } = await supabase
        .from('restaurants_public')
        .select('latitude, longitude, address')
        .eq('id', restaurantId)
        .maybeSingle();
      if (data) {
        setRestaurantAddress(data.address || '');
        if (data.latitude && data.longitude) {
          setRestaurantCoords({ lat: data.latitude, lng: data.longitude });
        }
      }
    })();
  }, [restaurantId]);

  useEffect(() => {
    if (orderType !== 'delivery') { setDistanceKm(null); setServerFee(null); setFeeError(null); return; }
    if (!deliveryCoords && !deliveryAddress.trim()) { setDistanceKm(null); setServerFee(null); setFeeError(null); return; }
    if (!restaurantCoords && !restaurantAddress) return;

    setServerFee(null);
    setFeeError(null);

    const handle = setTimeout(async () => {
      setCalculatingFee(true);
      try {
        const { data, error } = await supabase.functions.invoke('calculate-distance', {
          body: {
            restaurantCoords: restaurantCoords || undefined,
            restaurantAddress: restaurantCoords ? undefined : restaurantAddress,
            customerCoords: deliveryCoords || undefined,
            customerAddress: deliveryCoords ? undefined : deliveryAddress,
          },
        });
        if (!error && data?.distanceKm != null && data?.fee != null) {
          setDistanceKm(data.distanceKm);
          setServerFee(data.fee);
          setFeeError(null);
        } else {
          setDistanceKm(null);
          setServerFee(null);
          setFeeError("We couldn't locate that address on the map. Please refine it or drop a pin.");
        }
      } catch (err) {
        console.error('Distance calc error:', err);
        setDistanceKm(null);
        setServerFee(null);
        setFeeError("Couldn't calculate the delivery fee. Please try again.");
      } finally {
        setCalculatingFee(false);
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [orderType, deliveryAddress, deliveryCoords, restaurantCoords, restaurantAddress]);

  const deliveryFee = orderType === 'delivery' && serverFee != null
    ? Math.max(0, serverFee)
    : 0;
  const feeReady = orderType !== 'delivery' || serverFee != null;


  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast({
        title: "Notifications enabled",
        description: "You'll receive updates about your order status."
      });
    } else {
      toast({
        title: "Notifications blocked",
        description: "Please enable notifications in your browser settings.",
        variant: "destructive"
      });
    }
  };

  const handlePlaceOrder = async () => {
    if (!isOpen) {
      toast({
        title: "Restaurant closed",
        description: reason || "This restaurant is not accepting orders right now.",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to place an order.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      toast({
        title: "Delivery address required",
        description: "Please enter your delivery address.",
        variant: "destructive"
      });
      return;
    }

    if (orderType === 'delivery' && deliveryAddress.length > MAX_ADDRESS_LENGTH) {
      toast({
        title: "Address too long",
        description: `Please keep your address under ${MAX_ADDRESS_LENGTH} characters.`,
        variant: "destructive"
      });
      return;
    }

    if (orderType === 'delivery' && !feeReady) {
      toast({
        title: "Delivery fee not calculated",
        description: feeError || "Please wait for the delivery fee to be calculated, or refine your address so we can locate it on the map.",
        variant: "destructive"
      });
      return;
    }


    if (notes.length > MAX_NOTES_LENGTH) {
      toast({
        title: "Notes too long",
        description: `Please keep your notes under ${MAX_NOTES_LENGTH} characters.`,
        variant: "destructive"
      });
      return;
    }

    if (!restaurantId || items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add items to your cart before placing an order.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const orderPayload = {
        p_restaurant_id: restaurantId,
        p_delivery_address: orderType === 'delivery' ? deliveryAddress : 'Collection at store',
        p_notes: notes || null,
        p_payment_method: 'cash',
        p_items: items.map(item => ({
          menu_item_id: item.menuItemId,
          quantity: item.quantity
        })),
        p_order_type: orderType,
        p_delivery_fee: orderType === 'delivery' ? deliveryFee : null,
        p_tip_amount: orderType === 'delivery' ? tipAmount : 0,
        p_delivery_latitude: orderType === 'delivery' ? deliveryCoords?.lat ?? null : null,
        p_delivery_longitude: orderType === 'delivery' ? deliveryCoords?.lng ?? null : null,
        p_delivery_location_accuracy_m: orderType === 'delivery' ? deliveryCoords?.accuracy ?? null : null,
        p_delivery_place_id: orderType === 'delivery' ? deliveryCoords?.placeId ?? null : null,
        p_delivery_address_source: orderType === 'delivery' ? deliveryCoords?.source ?? 'manual' : null,
      };

      const { data: orderId, error: orderError } = await supabase.rpc('create_validated_order', orderPayload as never);

      if (orderError) {
        console.error('Order error:', orderError);
        toast({
          title: "Order Failed",
          description: orderError.message || "Failed to place order. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (!orderId) {
        toast({
          title: "Order Failed",
          description: "Failed to create order. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      clearCart();
      toast({
        title: "Order submitted!",
        description: "Waiting for the restaurant to confirm your order."
      });
      navigate(`/orders/${orderId}`);
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Error placing order",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <ShoppingBag size={48} className="text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">Add some delicious items to get started</p>
          <Button onClick={() => navigate('/')} className="btn-primary rounded-xl px-6">
            <ArrowLeft size={18} className="mr-2" />
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 md:py-8 pb-24 md:pb-8">
      <div className="container mx-auto px-4">
        <Button
          variant="ghost"
          className="mb-6 rounded-xl"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} className="mr-2" />
          Continue Shopping
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 animate-fade-in">
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Your Cart</h1>
            <p className="text-muted-foreground mb-6">From: {items[0]?.restaurantName}</p>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-foreground">{item.name}</h3>
                    <p className="text-primary font-bold text-sm">R{item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-background"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus size={14} />
                    </Button>
                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-background"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                  <p className="font-bold text-foreground w-20 text-right">
                    R{(item.price * item.quantity).toFixed(2)}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-lg sticky top-24">
              <h2 className="font-display text-xl font-bold text-foreground mb-6">Order Summary</h2>
              
              {/* Notification Permission */}
              {supported && permission !== 'granted' && (
                <div className="bg-primary/5 rounded-xl p-4 mb-4 border border-primary/10">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Bell className="text-primary" size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Enable notifications</p>
                      <p className="text-xs text-muted-foreground mb-3">Get updates about your order</p>
                      <Button size="sm" variant="outline" onClick={handleEnableNotifications} className="rounded-lg">
                        Enable
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4 mb-6">
                {/* Order Type Selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Order Type *</Label>
                  <OrderTypeSelector value={orderType} onChange={setOrderType} />
                </div>

                {/* Delivery Address */}
                {orderType === 'delivery' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Delivery Address *</Label>
                    <AddressAutocomplete
                      value={deliveryAddress}
                      onChange={setDeliveryAddress}
                      onCoordinatesChange={setDeliveryCoords}
                      placeholder="Search for your address"
                      showLocationButton={true}
                    />
                  </div>
                )}

                {/* Collection info */}
                {orderType === 'collection' && (
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-sm font-semibold mb-1">📍 Pickup Location</p>
                    <p className="text-sm text-muted-foreground">
                      {items[0]?.restaurantName} - Ready for collection!
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-semibold">Order Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special instructions?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES_LENGTH))}
                    rows={3}
                    maxLength={MAX_NOTES_LENGTH}
                    className="rounded-xl resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {notes.length}/{MAX_NOTES_LENGTH}
                  </p>
                </div>

                {/* Payment info */}
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">
                    💡 Choose payment after restaurant confirms your order.
                  </p>
                </div>
              </div>

              <div className="border-t border-border/50 pt-4 space-y-2 mb-6">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>R{total.toFixed(2)}</span>
                </div>
                {orderType === 'delivery' && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      Delivery Fee
                      {distanceKm != null && (
                        <span className="text-xs ml-1">({distanceKm} km)</span>
                      )}
                    </span>
                    <span>
                      {calculatingFee ? (
                        <Loader2 className="w-4 h-4 animate-spin inline" />
                      ) : distanceKm != null ? (
                        `R${deliveryFee.toFixed(2)}`
                      ) : (
                        <span className="text-xs">Enter address</span>
                      )}
                    </span>
                  </div>
                )}
                {orderType === 'delivery' && (
                  <div className="space-y-2 pt-2">
                    <Label className="text-sm font-semibold">Tip your driver (optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {[0, 5, 10, 20].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => { setTipAmount(v); setCustomTip(''); }}
                          className={cn(
                            'px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors',
                            tipAmount === v && !customTip
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted border-border/50 text-foreground hover:bg-muted/70'
                          )}
                        >
                          {v === 0 ? 'No tip' : `R${v}`}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        placeholder="Custom"
                        value={customTip}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setCustomTip(raw);
                          const n = parseFloat(raw);
                          setTipAmount(isFinite(n) && n >= 0 ? Math.min(1000, n) : 0);
                        }}
                        className="w-24 px-3 py-1.5 rounded-xl text-sm border border-border/50 bg-muted"
                      />
                    </div>
                  </div>
                )}
                {orderType === 'delivery' && tipAmount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Driver tip</span>
                    <span>R{tipAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground text-lg pt-3 border-t border-border/50">
                  <span>Total</span>
                  <span className="text-primary">R{(orderType === 'delivery' ? total + deliveryFee + tipAmount : total).toFixed(2)}</span>
                </div>
              </div>

              {/* Restaurant Closed Warning */}
              {!statusLoading && !isOpen && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <Clock className="text-destructive" size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-destructive">Restaurant Closed</p>
                      <p className="text-xs text-destructive/80 mt-1">{reason}</p>
                      {openingTime && closingTime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Hours: {openingTime} - {closingTime}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button 
                className="w-full btn-primary h-12 rounded-xl text-base font-semibold"
                onClick={handlePlaceOrder}
                disabled={loading || statusLoading || !isOpen}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Submitting Order...
                  </>
                ) : !isOpen ? (
                  'Restaurant Closed'
                ) : (
                  'Place Order'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
