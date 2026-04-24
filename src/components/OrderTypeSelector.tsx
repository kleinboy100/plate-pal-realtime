import { Truck, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderTypeSelectorProps {
  value: 'delivery' | 'collection';
  onChange: (type: 'delivery' | 'collection') => void;
}

export function OrderTypeSelector({ value, onChange }: OrderTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onChange('delivery')}
        className={cn(
          "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
          value === 'delivery'
            ? "border-primary bg-primary/10 text-primary"
            : "border-border hover:border-primary/50"
        )}
      >
        <Truck size={24} />
        <div className="text-center">
          <p className="font-medium">Delivery</p>
          <p className="text-xs text-muted-foreground">Calculated by distance</p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange('collection')}
        className={cn(
          "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
          value === 'collection'
            ? "border-primary bg-primary/10 text-primary"
            : "border-border hover:border-primary/50"
        )}
      >
        <Store size={24} />
        <div className="text-center">
          <p className="font-medium">Collection</p>
          <p className="text-xs text-muted-foreground">Pick up at store</p>
        </div>
      </button>
    </div>
  );
}
