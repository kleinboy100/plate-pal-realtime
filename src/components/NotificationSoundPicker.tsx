import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Music, Play, Trash2, Upload } from 'lucide-react';
import {
  getCustomSoundName,
  setCustomSound,
  clearCustomSound,
  playNotification,
  readFileAsDataUrl,
} from '@/lib/notificationSound';
import { toast } from '@/hooks/use-toast';

interface NotificationSoundPickerProps {
  /** Unique storage key for this user/context, e.g. `owner-<id>` */
  storageKey: string;
  /** Phrase spoken when no custom sound is set */
  previewText?: string;
  className?: string;
}

const MAX_BYTES = 2 * 1024 * 1024; // ~2MB to stay within localStorage limits

export function NotificationSoundPicker({
  storageKey,
  previewText = 'New order',
  className,
}: NotificationSoundPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [soundName, setSoundName] = useState<string | null>(() => getCustomSoundName(storageKey));

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast({ title: 'Invalid file', description: 'Please choose an audio file.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: 'File too large', description: 'Please choose an audio file under 2MB.', variant: 'destructive' });
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCustomSound(storageKey, dataUrl, file.name);
      setSoundName(file.name);
      toast({ title: 'Sound saved', description: `"${file.name}" will play for new alerts.` });
    } catch {
      toast({ title: 'Could not save', description: 'Your browser storage may be full. Try a smaller file.', variant: 'destructive' });
    }
  };

  const handleClear = () => {
    clearCustomSound(storageKey);
    setSoundName(null);
    toast({ title: 'Reset to default', description: 'The default voice alert will be used.' });
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <Music size={16} className="text-primary" />
        <p className="text-sm font-medium">Notification Sound</p>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {soundName ? `Current: ${soundName}` : 'Using default voice alert. Pick a song from your device to use instead.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={handlePick} />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload size={14} className="mr-1" />
          Choose Sound
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => playNotification(storageKey, previewText)}>
          <Play size={14} className="mr-1" />
          Test
        </Button>
        {soundName && (
          <Button type="button" variant="outline" size="sm" onClick={handleClear}>
            <Trash2 size={14} className="mr-1" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
