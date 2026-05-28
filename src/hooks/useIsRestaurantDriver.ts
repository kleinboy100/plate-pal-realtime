import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useIsRestaurantDriver() {
  const { user } = useAuth();
  const [isDriver, setIsDriver] = useState(false);
  const [driverRestaurantId, setDriverRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setIsDriver(false);
        setDriverRestaurantId(null);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('restaurant_drivers')
        .select('restaurant_id')
        .eq('user_id', user.id)
        .limit(1);
      if (error) {
        console.error('Driver check error:', error);
        setIsDriver(false);
      } else {
        setIsDriver(!!(data && data.length > 0));
        setDriverRestaurantId(data?.[0]?.restaurant_id ?? null);
      }
      setLoading(false);
    };
    check();
  }, [user]);

  return { isDriver, driverRestaurantId, loading };
}
