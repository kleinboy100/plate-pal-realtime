import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Trash2, Bike } from 'lucide-react';

interface Driver {
  id: string;
  email: string;
  user_id: string;
  created_at: string;
}

export function DriverManager({ restaurantId }: { restaurantId: string }) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (restaurantId) fetchDrivers();
  }, [restaurantId]);

  const fetchDrivers = async () => {
    const { data } = await supabase
      .from('restaurant_drivers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    setDrivers(data || []);
  };

  const addDriver = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('resolve-staff-email', {
        body: { email: email.trim(), restaurant_id: restaurantId, role: 'driver' },
      });
      if (fnError || !fnData?.success) {
        toast({
          title: 'Error',
          description: fnData?.error || 'Could not add driver. Make sure the email is registered.',
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Driver added', description: `${email} has been added as a driver.` });
      setEmail('');
      fetchDrivers();
    } finally {
      setLoading(false);
    }
  };

  const removeDriver = async (id: string, em: string) => {
    const { error } = await supabase.from('restaurant_drivers').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Could not remove driver.', variant: 'destructive' });
    } else {
      toast({ title: 'Removed', description: `${em} has been removed.` });
      fetchDrivers();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Bike size={20} className="text-primary" />
        <h3 className="font-semibold text-base">Delivery Drivers</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Drivers can see ready delivery orders, accept them, navigate via the map, and mark them delivered.
      </p>

      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter driver email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addDriver()}
        />
        <Button onClick={addDriver} disabled={loading || !email.trim()} size="sm">
          <UserPlus size={16} className="mr-1" />
          Add
        </Button>
      </div>

      {drivers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No drivers added yet.</p>
      ) : (
        <div className="space-y-2">
          {drivers.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
              <div>
                <p className="text-sm font-medium">{d.email}</p>
                <p className="text-xs text-muted-foreground">Added {new Date(d.created_at).toLocaleDateString()}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeDriver(d.id, d.email)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
