import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// This public view must remain readable even when a customer's session refresh
// is expired, stalled or offline. Never attach their session to this client.
export const publicRestaurantClient = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  },
);