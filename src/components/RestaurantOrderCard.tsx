import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { OrderChat } from './OrderChat';
import { Check, X, ChefHat, Package, Truck, Home, Bell, CreditCard, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderItem {
  id: string;
  quantity: number;
  item_name: string;
  price: number;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  delivery_fee?: number;
  tip_amount?: number;
  delivery_address: string;
  notes?: string;
  created_at: string;
  order_items?: OrderItem[];
  payment_method?: string;
  payment_confirmed?: boolean;
  order_type?: 'delivery' | 'collection';
  order_number?: number;
}

interface RestaurantOrderCardProps {
  order: Order;
  onUpdateStatus: (orderId: string, status: string) => Promise<void>;
  isNew?: boolean;
  /** When false, the "Out for Delivery" step is hidden (e.g. for staff) */
  canMarkOutForDelivery?: boolean;
}

// Status flow for delivery orders
const deliveryStatusFlow = [
  { status: 'confirmed', label: 'Accept Order', icon: Check, color: 'bg-green-500 hover:bg-green-600' },
  { status: 'preparing', label: 'Start Preparing', icon: ChefHat, color: 'bg-orange-500 hover:bg-orange-600' },
  { status: 'ready', label: 'Ready for Pickup', icon: Package, color: 'bg-blue-500 hover:bg-blue-600' },
  { status: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, color: 'bg-purple-500 hover:bg-purple-600' },
  { status: 'delivered', label: 'Mark Delivered', icon: Home, color: 'bg-green-600 hover:bg-green-700' },
];

// Status flow for collection orders (no out_for_delivery step)
const collectionStatusFlow = [
  { status: 'confirmed', label: 'Accept Order', icon: Check, color: 'bg-green-500 hover:bg-green-600' },
  { status: 'preparing', label: 'Start Preparing', icon: ChefHat, color: 'bg-orange-500 hover:bg-orange-600' },
  { status: 'ready', label: 'Ready for Pickup', icon: Package, color: 'bg-blue-500 hover:bg-blue-600' },
  { status: 'delivered', label: 'Mark Collected', icon: Home, color: 'bg-green-600 hover:bg-green-700' },
];

const getNextAction = (currentStatus: string, orderType: 'delivery' | 'collection' = 'delivery') => {
  const statusFlow = orderType === 'collection' ? collectionStatusFlow : deliveryStatusFlow;
  const currentIndex = statusFlow.findIndex(s => s.status === currentStatus);
  if (currentStatus === 'pending') return statusFlow[0]; // Accept order
  if (currentIndex >= 0 && currentIndex < statusFlow.length - 1) {
    return statusFlow[currentIndex + 1];
  }
  return null;
};

export function RestaurantOrderCard({ order, onUpdateStatus, isNew, canMarkOutForDelivery = true }: RestaurantOrderCardProps) {
  const [loading, setLoading] = useState(false);
  const orderType = order.order_type || 'delivery';
  const nextAction = getNextAction(order.status, orderType);
  // Staff are not allowed to move delivery orders "out for delivery" or to
  // mark them "delivered" — only the assigned driver or the owner can do that.
  const blockedAction =
    !canMarkOutForDelivery &&
    orderType === 'delivery' &&
    (nextAction?.status === 'out_for_delivery' || nextAction?.status === 'delivered');

  const handleAction = async (status: string) => {
    setLoading(true);
    await onUpdateStatus(order.id, status);
    setLoading(false);
  };

  const handleDecline = async () => {
    setLoading(true);
    await onUpdateStatus(order.id, 'cancelled');
    setLoading(false);
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className={cn(
      "card-elevated p-4 transition-all",
      isNew && "ring-2 ring-primary animate-pulse-slow"
    )}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold">Order #{order.order_number ? String(order.order_number).padStart(5, '0') : order.id.slice(0, 8)}</p>
            {isNew && (
              <span className="flex items-center gap-1 bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                <Bell size={12} />
                New Order
              </span>
            )}
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              orderType === 'collection' 
                ? "bg-blue-100 text-blue-800" 
                : "bg-purple-100 text-purple-800"
            )}>
              {orderType === 'collection' ? '📦 Collection' : '🚚 Delivery'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <span className={cn(
          "px-2 py-1 rounded text-xs font-medium",
          order.status === 'pending' && "bg-yellow-100 text-yellow-800",
          order.status === 'confirmed' && "bg-blue-100 text-blue-800",
          order.status === 'preparing' && "bg-orange-100 text-orange-800",
          order.status === 'ready' && "bg-green-100 text-green-800",
          order.status === 'out_for_delivery' && "bg-purple-100 text-purple-800",
          order.status === 'delivered' && "bg-green-200 text-green-900",
          order.status === 'cancelled' && "bg-red-100 text-red-800"
        )}>
          {formatStatus(order.status)}
        </span>
      </div>

      {/* Order Items */}
      <div className="bg-muted/50 rounded-lg p-3 mb-3">
        <p className="text-sm font-medium mb-2">Items:</p>
        {order.order_items?.map((item) => (
          <div key={item.id} className="flex justify-between text-sm py-1">
            <span>{item.quantity}x {item.item_name}</span>
            <span className="text-muted-foreground">R{(Number(item.price) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t mt-2 pt-2 space-y-1">
          {(() => {
            const deliveryFee = Number(order.delivery_fee ?? 0);
            const tip = Number(order.tip_amount ?? 0);
            const mealsTotal = Number(order.total_amount) - deliveryFee - tip;
            return (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Meals total</span>
                  <span>R{mealsTotal.toFixed(2)}</span>
                </div>
                {orderType !== 'collection' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery price</span>
                    <span>R{deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {tip > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tip</span>
                    <span>R{tip.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>Total due</span>
                  <span>R{Number(order.total_amount).toFixed(2)}</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Delivery/Collection Address */}
      <p className="text-sm mb-3">
        <span className="text-muted-foreground">
          {orderType === 'collection' ? 'Collection: ' : 'Delivery: '}
        </span>
        {orderType === 'collection' ? 'Customer will collect at store' : order.delivery_address}
      </p>

      {/* Notes */}
      {order.notes && (
        <p className="text-sm mb-3 bg-yellow-50 p-2 rounded">
          <span className="font-medium">Notes: </span>
          {order.notes}
        </p>
      )}

      {/* Payment Warning for confirmed orders */}
      {order.status === 'confirmed' && !order.payment_confirmed && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 flex items-center gap-2">
          <AlertCircle className="text-amber-600 shrink-0" size={18} />
          <div>
            <p className="text-sm font-medium text-amber-800">Awaiting Payment</p>
            <p className="text-xs text-amber-700">Customer must select a payment method before you can start preparing.</p>
          </div>
        </div>
      )}

      {/* Payment confirmed indicator */}
      {order.payment_confirmed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3 flex items-center gap-2">
          <CreditCard className="text-green-600" size={16} />
          <p className="text-sm text-green-800">
            Payment: {order.payment_method === 'cash' ? 'Cash on Delivery' : 'Paid Online'}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t">
        <div className="flex gap-2">
          {order.status === 'pending' && (
            <>
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={() => handleAction('confirmed')}
                disabled={loading}
              >
                <Check size={16} className="mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDecline}
                disabled={loading}
              >
                <X size={16} className="mr-1" />
                Decline
              </Button>
            </>
          )}

          {order.status !== 'pending' && 
           order.status !== 'delivered' && 
           order.status !== 'cancelled' && 
           nextAction && !blockedAction && (
            <>
              <Button
                size="sm"
                className={cn("text-white", nextAction.color)}
                onClick={() => handleAction(nextAction.status)}
                disabled={loading || (order.status === 'confirmed' && !order.payment_confirmed)}
              >
                <nextAction.icon size={16} className="mr-1" />
                {nextAction.label}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (window.confirm('Cancel this order? This cannot be undone.')) {
                    handleDecline();
                  }
                }}
                disabled={loading}
              >
                <X size={16} className="mr-1" />
                Cancel
              </Button>
            </>
          )}

          {blockedAction && (
            <p className="text-xs text-muted-foreground">
              Order is ready. A driver will take it out for delivery.
            </p>
          )}
        </div>

        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <OrderChat orderId={order.id} userType="restaurant" />
        )}
      </div>
    </div>
  );
}