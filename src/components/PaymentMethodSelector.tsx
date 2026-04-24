import { Banknote, CreditCard, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (method: string) => void;
  onlinePaymentAvailable?: boolean;
}

export function PaymentMethodSelector({ value, onChange, onlinePaymentAvailable = true }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onChange('cash')}
        className={cn(
          "w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
          value === 'cash'
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          value === 'cash' ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          <Banknote className="w-5 h-5" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium">Cash on Delivery</p>
          <p className="text-sm text-muted-foreground">Pay when your order arrives</p>
          <p className="text-xs text-muted-foreground mt-0.5">We accept card payment on collection</p>
        </div>
        {value === 'cash' && (
          <Check className="w-5 h-5 text-primary" />
        )}
      </button>

      <button
        type="button"
        onClick={() => onlinePaymentAvailable && onChange('online')}
        disabled={!onlinePaymentAvailable}
        className={cn(
          "w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
          !onlinePaymentAvailable && "opacity-50 cursor-not-allowed",
          value === 'online'
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          value === 'online' ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          <CreditCard className="w-5 h-5" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium">Pay Online</p>
          <p className="text-sm text-muted-foreground">
            {onlinePaymentAvailable 
              ? "Secure payment via Yoco" 
              : "Not available for this restaurant"}
          </p>
        </div>
        {value === 'online' && (
          <Check className="w-5 h-5 text-primary" />
        )}
      </button>
    </div>
  );
}