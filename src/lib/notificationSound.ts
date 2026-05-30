// Shared notification sound utilities.
// Each "context" (owner/staff/driver/customer) stores its own custom sound
// as a base64 data URL in localStorage. When no custom sound is set we fall
// back to speaking a short phrase (e.g. "New order") via the Web Speech API.

const PREFIX = 'notif_sound_';
const NAME_PREFIX = 'notif_sound_name_';

export function getCustomSound(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function getCustomSoundName(key: string): string | null {
  try {
    return localStorage.getItem(NAME_PREFIX + key);
  } catch {
    return null;
  }
}

export function setCustomSound(key: string, dataUrl: string, name: string) {
  try {
    localStorage.setItem(PREFIX + key, dataUrl);
    localStorage.setItem(NAME_PREFIX + key, name);
  } catch (e) {
    console.warn('Could not save notification sound', e);
    throw e;
  }
}

export function clearCustomSound(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
    localStorage.removeItem(NAME_PREFIX + key);
  } catch {
    /* ignore */
  }
}

let sharedAudio: HTMLAudioElement | null = null;

function speak(text: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-ZA';
    u.rate = 1;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

/**
 * Play the notification for a given context.
 * - If the user picked a custom sound, play it.
 * - Otherwise speak the fallback phrase out loud.
 */
export function playNotification(key: string, fallbackText: string) {
  const custom = getCustomSound(key);
  if (custom) {
    try {
      if (!sharedAudio) sharedAudio = new Audio();
      sharedAudio.src = custom;
      sharedAudio.currentTime = 0;
      sharedAudio.play().catch(() => speak(fallbackText));
      return;
    } catch {
      speak(fallbackText);
      return;
    }
  }
  speak(fallbackText);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
