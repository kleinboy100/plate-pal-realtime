import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { OrderStatusTracker } from '@/components/OrderStatusTracker';
import { OrderChat } from '@/components/OrderChat';
import { CallRestaurantButton } from '@/components/CallRestaurantButton';
import { ReviewForm } from '@/components/ReviewForm';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { DeliveryETA } from '@/components/DeliveryETA';
import { supabase } from '@/integrations/supabase/client';
import { Bell, XCircle, Star, Banknote, CreditCard, Loader2 } from 'lucide-react';
import { usePushNotifications, ORDER_STATUS_MESSAGES } from '@/hooks/usePushNotifications';
import { NotificationSoundPicker } from '@/components/NotificationSoundPicker';
import { playNotification } from '@/lib/notificationSound';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function OrderDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [onlinePaymentAvailable, setOnlinePaymentAvailable] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [awaitingPaymentConfirmation, setAwaitingPaymentConfirmation] = useState(false);
  const { permission, requestPermission, showNotification, supported } = usePushNotifications();
  const previousStatus = useRef<string | null>(null);
  const toastShownRef = useRef(false);
  const soundKey = `customer-${user?.id ?? 'anon'}`;

  // Handle payment return messages
  useEffect(() => {
    if (toastShownRef.current) return;
    
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toastShownRef.current = true;
      setAwaitingPaymentConfirmation(true);
      
      // Immediately refetch order to get latest payment status
      const refetchOrder = async () => {
        const { data } = await supabase
          .from('orders')
          .select('*, restaurants(name, address, latitude, longitude)')
          .eq('id', id)
          .single();
        
        if (data) {
          setOrder(data);
          if (data.payment_confirmed) {
            setAwaitingPaymentConfirmation(false);
            toast({
              title: "Payment confirmed! ✓",
              description: "Your payment has been processed successfully."
            });
          } else {
            // Fallback: actively verify checkout status (useful when webhook delivery/signature is not working in test)
            try {
              await supabase.functions.invoke('verify-yoco-checkout', {
                body: { orderId: id }
              });

              const { data: refreshed } = await supabase
                .from('orders')
                .select('*, restaurants(name, address, latitude, longitude)')
                .eq('id', id)
                .single();

              if (refreshed) {
                setOrder(refreshed);
                if (refreshed.payment_confirmed) {
                  setAwaitingPaymentConfirmation(false);
                  toast({
                    title: "Payment confirmed! ✓",
                    description: "Your payment has been processed successfully."
                  });
                  return;
                }
              }
            } catch {
              // ignore; polling fallback below will still run
            }

            toast({
              title: "Payment submitted!",
              description: "Waiting for confirmation..."
            });
          }
        }
      };
      
      refetchOrder();
    } else if (paymentStatus === 'cancelled') {
      toastShownRef.current = true;
      toast({
        title: "Payment cancelled",
        description: "You can try again or choose cash on delivery.",
        variant: "destructive"
      });
    } else if (paymentStatus === 'failed') {
      toastShownRef.current = true;
      toast({
        title: "Payment failed",
        description: "Please try again or choose a different payment method.",
        variant: "destructive"
      });
    }
  }, [searchParams, toast, id]);

  // Poll for payment confirmation when awaiting
  useEffect(() => {
    if (!awaitingPaymentConfirmation || !id) return;
    
    // If already confirmed via realtime, stop polling
    if (order?.payment_confirmed) {
      setAwaitingPaymentConfirmation(false);
      toast({
        title: "Payment confirmed! ✓",
        description: "Your payment has been processed successfully."
      });
      return;
    }
    
    // Poll every 2 seconds for payment confirmation
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('payment_confirmed, payment_method')
        .eq('id', id)
        .single();
      
      if (data?.payment_confirmed) {
        setOrder((prev: any) => ({ ...prev, payment_confirmed: true, payment_method: data.payment_method }));
        setAwaitingPaymentConfirmation(false);
        toast({
          title: "Payment confirmed! ✓",
          description: "Your payment has been processed successfully."
        });
        clearInterval(pollInterval);
      }
    }, 2000);
    
    // Stop polling after 60 seconds
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      setAwaitingPaymentConfirmation(false);
      toast({
        title: "Still waiting for payment confirmation",
        description: "If you were charged, it may take a moment to reflect. Please refresh this page in a few seconds."
      });
    }, 60000);
    
    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [awaitingPaymentConfirmation, id, order?.payment_confirmed, toast]);

  useEffect(() => {
    if (id) {
      fetchOrder();
      checkExistingReview();
      
      // Subscribe to real-time order updates
      const channel = supabase
        .channel(`order-detail-${id}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders', 
          filter: `id=eq.${id}` 
        }, (payload) => {
          const newOrder = payload.new as any;
          
          // Show push notification if status changed
          if (previousStatus.current && previousStatus.current !== newOrder.status) {
            const message = ORDER_STATUS_MESSAGES[newOrder.status];
            if (message) {
              showNotification(message.title, { body: message.body, tag: `order-${id}` });
              playNotification(soundKey, message.title.replace(/[^\w\s!]/g, '').trim());
            }
          }
          previousStatus.current = newOrder.status;
          
          // Immediately update all order fields from the payload
          setOrder((prev: any) => ({ ...prev, ...newOrder }));
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.error('Realtime channel error, falling back to polling');
          }
        });
        
      // Polling fallback in case realtime is unavailable
      const poll = setInterval(() => {
        fetchOrder();
      }, 15000);

      return () => { 
        supabase.removeChannel(channel); 
        clearInterval(poll);
      };
    }
  }, [id, showNotification, soundKey]);

  // Check online payment availability when order loads
  useEffect(() => {
    if (order?.restaurant_id) {
      checkOnlinePayment();
    }
  }, [order?.restaurant_id]);

  const fetchOrder = async () => {
    const [orderRes, itemsRes] = await Promise.all([
      supabase.from('orders').select('*, restaurants(name, address, latitude, longitude)').eq('id', id).maybeSingle(),
      supabase.from('order_items').select('*').eq('order_id', id)
    ]);
    setOrder(orderRes.data);
    setItems(itemsRes.data || []);
    if (orderRes.data) {
      previousStatus.current = orderRes.data.status;
      setPaymentMethod(orderRes.data.payment_method || 'cash');
    }
  };

  const checkOnlinePayment = async () => {
    if (!order?.restaurant_id) return;
    
    setCheckingPayment(true);
    try {
      const { data: hasPayment } = await supabase
        .rpc('restaurant_has_online_payment', { p_restaurant_id: order.restaurant_id });
      setOnlinePaymentAvailable(!!hasPayment);
    } catch (error) {
      console.error('Error checking payment availability:', error);
    } finally {
      setCheckingPayment(false);
    }
  };

  const checkExistingReview = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('id')
      .eq('order_id', id)
      .single();
    setHasReviewed(!!data);
  };

  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  const handleReviewSuccess = () => {
    setHasReviewed(true);
    setShowReviewForm(false);
  };

  const handleConfirmPayment = async () => {
    if (!order) return;

    setConfirmingPayment(true);

    try {
      if (paymentMethod === 'online') {
        // Redirect to Yoco checkout
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-yoco-checkout', {
          body: { 
            orderId: order.id,
            successUrl: `${window.location.origin}/orders/${order.id}?payment=success`,
            cancelUrl: `${window.location.origin}/orders/${order.id}?payment=cancelled`,
            failureUrl: `${window.location.origin}/orders/${order.id}?payment=failed`,
          }
        });

        if (checkoutError || checkoutData?.error) {
          toast({
            title: "Payment setup failed",
            description: checkoutData?.error || "Could not initiate online payment. Please try again.",
            variant: "destructive"
          });
          setConfirmingPayment(false);
          return;
        }

        // Redirect to Yoco payment page
        window.location.href = checkoutData.checkoutUrl;
        return;
      } else {
        // Cash on delivery - use SECURITY DEFINER RPC for reliable update
        const { data: success, error } = await supabase
          .rpc('confirm_cod_payment', { p_order_id: order.id });

        if (error || !success) {
          console.error('COD confirmation error:', error);
          toast({
            title: "Error",
            description: "Failed to confirm payment method. Please try again.",
            variant: "destructive"
          });
        } else {
          // Immediately update local state so UI reflects the change
          setOrder((prev: any) => ({ ...prev, payment_method: 'cash', payment_confirmed: true }));
          toast({
            title: "Payment method confirmed",
            description: "You'll pay cash when your order arrives."
          });
        }
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setConfirmingPayment(false);
    }
  };

  if (!order) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse">Loading...</div></div>;
  const canReview = order.status === 'delivered' && !hasReviewed;
  
  // Show payment selection after restaurant confirms (status = 'confirmed') and payment not yet confirmed
  const showPaymentSelection = order.status === 'confirmed' && !order.payment_confirmed;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-2xl font-bold">Order #{String(order.order_number).padStart(5, '0')}</h1>
        </div>
        <p className="text-muted-foreground mb-6">From: {order.restaurants?.name}</p>

        {/* Notification Permission Banner */}
        {supported && permission !== 'granted' && (
          <div className="bg-primary/10 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Bell className="text-primary" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium">Enable notifications</p>
              <p className="text-xs text-muted-foreground">Get alerts when your order status changes</p>
            </div>
            <Button size="sm" onClick={handleEnableNotifications}>Enable</Button>
          </div>
        )}

        {/* Custom Notification Sound */}
        <div className="card-elevated p-4 mb-6">
          <NotificationSoundPicker storageKey={soundKey} previewText="Your order status has changed" />
        </div>
        

        
        <div className="card-elevated p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Order Status</h2>
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <div className="flex items-center gap-2">
                <CallRestaurantButton 
                  orderId={order.id} 
                  orderStatus={order.status}
                  variant="outline"
                  size="sm"
                />
                <OrderChat orderId={order.id} userType="customer" defaultOpen={searchParams.get('chat') === 'open'} />
              </div>
            )}
          </div>
          <OrderStatusTracker status={order.status} orderType={order.order_type || 'delivery'} />

          {/* Delivery ETA - shows for active delivery orders only */}
          {order.order_type !== 'collection' && order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'pending' && (
            <DeliveryETA
              status={order.status}
              orderCreatedAt={order.created_at}
              restaurantAddress={order.restaurants?.address}
              customerAddress={order.delivery_address}
              restaurantCoords={
                order.restaurants?.latitude && order.restaurants?.longitude
                  ? { lat: order.restaurants.latitude, lng: order.restaurants.longitude }
                  : undefined
              }
              className="mt-6"
            />
          )}
          
          {/* Collection Ready message */}
          {order.order_type === 'collection' && order.status === 'ready' && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                🎉 Your order is ready for collection! Head to {order.restaurants?.name || 'the store'} to pick it up.
              </p>
            </div>
          )}
          {/* Status Messages */}
          {order.status === 'pending' && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⏳ Waiting for the restaurant to confirm your order...
              </p>
            </div>
          )}
        {/* Payment Processing Indicator - only show when awaiting and not yet confirmed */}
          {awaitingPaymentConfirmation && !order.payment_confirmed && order.status === 'confirmed' && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">Payment processing...</p>
                <p className="text-xs text-amber-600">This usually takes a few seconds</p>
              </div>
            </div>
          )}
          
          {/* Payment Confirmed Indicator - show when payment is confirmed for online orders */}
          {order.payment_confirmed && order.payment_method === 'online' && (order.status === 'confirmed' || order.status === 'preparing') && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800">
                ✓ Payment confirmed - Restaurant will start preparing soon!
              </p>
            </div>
          )}
          
          {order.status === 'awaiting_payment' && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💳 Waiting for payment confirmation...
              </p>
            </div>
          )}
          {order.status === 'confirmed' && !showPaymentSelection && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                ✅ Order confirmed! The restaurant will start preparing soon.
              </p>
            </div>
          )}
          {order.status === 'preparing' && (
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                👨‍🍳 Your food is being prepared with care!
              </p>
            </div>
          )}
          {order.status === 'delivered' && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                🎉 Your order has been delivered! Enjoy your meal.
              </p>
            </div>
          )}
          {order.status === 'cancelled' && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <XCircle className="text-red-500" size={18} />
              <p className="text-sm text-red-800">
                This order was cancelled. Please contact us if you have questions.
              </p>
            </div>
          )}
        </div>

        {/* Payment Selection - shown after restaurant confirms */}
        {showPaymentSelection && (
          <div className="card-elevated p-6 mb-6 border-2 border-primary">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="text-primary" size={20} />
              <h2 className="font-semibold">Select Payment Method</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Great news! The restaurant has confirmed your order. Please select how you'd like to pay.
            </p>
            
            {checkingPayment ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Checking payment options...</span>
              </div>
            ) : (
              <>
                <PaymentMethodSelector 
                  value={paymentMethod} 
                  onChange={setPaymentMethod}
                  onlinePaymentAvailable={onlinePaymentAvailable}
                />
                
                <Button 
                  className="w-full mt-4 btn-primary h-12"
                  onClick={handleConfirmPayment}
                  disabled={confirmingPayment}
                >
                  {confirmingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : paymentMethod === 'online' ? (
                    'Pay Now'
                  ) : (
                    'Confirm Cash on Delivery'
                  )}
                </Button>
              </>
            )}
          </div>
        )}


        {/* Review Section */}
        {canReview && (
          <div className="card-elevated p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="text-yellow-400" size={20} />
              <h2 className="font-semibold">Rate Your Experience</h2>
            </div>
            {showReviewForm ? (
              <ReviewForm
                restaurantId={order.restaurant_id}
                orderId={order.id}
                onSuccess={handleReviewSuccess}
              />
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">How was your order?</p>
                <Button onClick={() => setShowReviewForm(true)}>
                  <Star className="mr-2" size={18} />
                  Leave a Review
                </Button>
              </div>
            )}
          </div>
        )}

        {hasReviewed && order.status === 'delivered' && (
          <div className="card-elevated p-6 mb-6 bg-green-50">
            <div className="flex items-center gap-2">
              <Star className="text-yellow-400 fill-yellow-400" size={20} />
              <p className="text-sm text-green-800">Thank you for your review!</p>
            </div>
          </div>
        )}

        <div className="card-elevated p-6">
          <h2 className="font-semibold mb-4">Items</h2>
          {items.map(item => (
            <div key={item.id} className="flex justify-between py-2 border-b last:border-0">
              <span>{item.quantity}x {item.item_name}</span>
              <span>R{(Number(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold pt-4 mt-4 border-t">
            <span>Total</span>
            <span>R{Number(order.total_amount).toFixed(2)}</span>
          </div>
          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-sm text-muted-foreground">
              {order.order_type === 'collection' ? 'Collection at: ' : 'Delivery: '}{order.delivery_address}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Banknote size={16} />
              <span>Payment: {order.payment_confirmed ? (order.payment_method === 'cash' ? 'Cash on Delivery' : 'Paid Online') : 'Pending selection'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
