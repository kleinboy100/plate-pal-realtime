import { useAuth } from '@/contexts/AuthContext';
import { useIsRestaurantDriver } from '@/hooks/useIsRestaurantDriver';
import { Button } from '@/components/ui/button';
import { Bell, Volume2 } from 'lucide-react';
import { NotificationSoundPicker } from '@/components/NotificationSoundPicker';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function NotificationSettings() {
  const { user } = useAuth();
  const { isDriver } = useIsRestaurantDriver();
  const { permission, requestPermission, supported } = usePushNotifications();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please sign in.</p>
      </div>
    );
  }

  const soundKey = isDriver ? `driver-${user.id}` : `restaurant-${user.id}`;
  const previewText = isDriver ? 'New delivery available' : 'New order received';

  return (
    <div className="min-h-screen py-6 md:py-10 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 max-w-xl">
        <h1 className="font-display text-xl md:text-2xl font-bold gradient-text mb-6">
          Notification Settings
        </h1>

        <div className="card-elevated p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-primary" />
            <p className="text-sm font-medium">Push Notifications</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Get alerted when a new order or status change comes in, even when the app is in the background.
          </p>
          {!supported ? (
            <p className="text-xs text-muted-foreground">Not supported on this device/browser.</p>
          ) : permission === 'granted' ? (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Volume2 size={14} /> Notifications are on
            </span>
          ) : (
            <Button variant="outline" size="sm" onClick={() => requestPermission()}>
              <Bell size={14} className="mr-1" />
              Enable Notifications
            </Button>
          )}
        </div>

        <div className="card-elevated p-4">
          <NotificationSoundPicker storageKey={soundKey} previewText={previewText} />
        </div>
      </div>
    </div>
  );
}
