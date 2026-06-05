import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Power } from 'lucide-react';

interface StoreOpenToggleProps {
  restaurantId: string;
}

export function StoreOpenToggle({ restaurantId }: StoreOpenToggleProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('restaurants')
        .select('is_accepting_orders')
        .eq('id', restaurantId)
        .single();
      if (data) setIsOpen(data.is_accepting_orders ?? true);
      setLoading(false);
    };
    if (restaurantId) fetchStatus();
  }, [restaurantId]);

  const handleToggle = async (checked: boolean) => {
    setIsOpen(checked);
    setSaving(true);
    const { data, error } = await supabase.rpc('set_store_open', {
      p_restaurant_id: restaurantId,
      p_open: checked,
    });
    if (error || !data) {
      toast.error('Failed to update store status');
      setIsOpen(!checked);
    } else {
      toast.success(checked ? 'Store is now open for orders' : 'Store is now closed');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="card-elevated p-4 animate-pulse">
        <div className="h-10 bg-muted rounded w-full" />
      </div>
    );
  }

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Power className={isOpen ? 'text-green-500' : 'text-muted-foreground'} size={20} />
          <div>
            <Label htmlFor="store-open" className="font-medium">
              {isOpen ? 'Store Open' : 'Store Closed'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isOpen ? 'Accepting orders' : 'Not accepting orders'}
            </p>
          </div>
        </div>
        <Switch
          id="store-open"
          checked={isOpen}
          onCheckedChange={handleToggle}
          disabled={saving}
        />
      </div>
    </div>
  );
}
